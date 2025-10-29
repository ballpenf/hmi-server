import React from "react";

type PcsProps = {
  id: string;
  width: number;
  height: number;
  style?: React.CSSProperties;
};

const Pcs = ({ id, width, height, style }: PcsProps) => {
  return (
    <div
      id={id}
      style={{
        width,
        height,
        position: "relative", // 컨테이너 박스
        ...style,
      }}
    >
      {/* 문 몸체 */}
      <div
        className="pcs1_icon1"
        style={{
          width: 30,
          height: 40,
          border: "2px solid green",
          position: "absolute",
          top: 5, // marginTop 대신 absolute top
          left: 10, // 50-30=20 → 가운데 정렬
          backgroundColor: style?.backgroundColor ?? "transparent",
        }}
      />

      {/* 손잡이 */}
      <div
        className="pcs1_icon2"
        style={{
          width: 2,
          height: 10,
          border: "1px solid green",
          position: "absolute",
          top: 20,
          left: 15,
        }}
      />

      {/* 중간 연결부 */}
      <div
        className="pcs1_icon3"
        style={{
          width: 20,
          height: 5,
          borderLeft: "2px solid green",
          borderRight: "2px solid green",
          position: "absolute",
          bottom: 8,
          left: 15,
        }}
      />

      {/* 받침대 */}
      <div
        className="pcs1_icon4"
        style={{
          width: 40,
          height: 5,
          border: "2px solid green",
          position: "absolute",
          bottom: 0,
          left: 5,
        }}
      />
    </div>
  );
};

export default Pcs;
