import type { RequestHandler } from "express";
import * as mainService from "../services/mainService.js";

export const getTooltestData: RequestHandler = async (req, res, next) => {
  try {
    const data = await mainService.selectTooltest();
    res.json({ ok: true, data });
  } catch (err) {
    next(err);
  }
};

export const setTooltestData: RequestHandler = async (req, res, next) => {
  try {
    const { input } = req.body;
    await mainService.insertTooltest(input);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
};

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
    const map = await mainService.getValues(list);
    res.json(map);
  } catch (err) {
    next(err);
  }
};

export const setValues: RequestHandler = async (req, res, next) => {
  try {
    console.log("setValues", req.body);
    //setValues { updates: [ { id: 'pcs1mode', value: 0 } ] }
  } catch (err) {
    next(err);
  }
};
