import type { RequestHandler } from "express";
import * as dataService from "../services/dataService.js";

export const getValues: RequestHandler = async (req, res, next) => {
  try {
    const raw = req.body?.ids as unknown;

    // 1) 배열인지 확인
    if (!Array.isArray(raw)) {
      return res.json({}); // ids 없으면 빈 맵 반환
    }

    // 2) 문자열만 필터 + 공백 제거 + 중복 제거
    const list = [
      ...new Set(
        raw
          .filter((v): v is string => typeof v === "string")
          .map((s) => s.trim())
          .filter((s) => s.length > 0)
      ),
    ];

    if (list.length === 0) return res.json({});
    if (list.length > 500) {
      return res
        .status(413)
        .json({ ok: false, error: "too many ids (max 500)" });
    }

    // 3) 이제 list는 string[] 로 안전하게 좁혀짐
    const map = await dataService.getValues(list);
    res.json(map);
  } catch (err) {
    next(err);
  }
};

export const setValues: RequestHandler = async (req, res, next) => {
  try {
    const data = await dataService.setValues(req.body.updates);
    console.log("setValues", req.body.updates[0].id);

    //pcs 충전방전시 배터리 충전방전 모듈
    if (req.body.updates[0].id === "pcs1mode") {
      const data = await dataService.setValues([
        { id: "bat1state", value: req.body.updates[0].value },
      ]);
    }

    //릴레이 제어
    if (req.body.updates[0].id === "relay1") {
      const value = req.body.updates[0].value;
      if (value === 0) {
        await dataService.setValues([{ id: "relay1on", value: 0 }]);
        await dataService.setValues([{ id: "relay1off", value: 1 }]);
        await dataService.setValues([{ id: "bar1", value: 0 }]);
      } else if (value === 1) {
        await dataService.setValues([{ id: "relay1on", value: 1 }]);
        await dataService.setValues([{ id: "relay1off", value: 0 }]);
        await dataService.setValues([{ id: "bar1", value: 1 }]);
      }
    }

    if (req.body.updates[0].id === "relay2") {
      const value = req.body.updates[0].value;
      if (value === 0) {
        await dataService.setValues([{ id: "relay2on", value: 0 }]);
        await dataService.setValues([{ id: "relay2off", value: 1 }]);
        await dataService.setValues([{ id: "bar3", value: 0 }]);
      } else if (value === 1) {
        await dataService.setValues([{ id: "relay2on", value: 1 }]);
        await dataService.setValues([{ id: "relay2off", value: 0 }]);
        await dataService.setValues([{ id: "bar3", value: 1 }]);
      }
    }

    res.json({ ok: true, data });
  } catch (err) {
    next(err);
  }
};
