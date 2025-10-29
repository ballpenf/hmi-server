type BatteryProps = {
  id: string;
  width: number;
  height: number;
  style?: React.CSSProperties;
  value: number;
};

const Battery = ({ id, style, value }: BatteryProps) => {
  //const filled = Math.max(0, Math.min(value, 4)); // 0~4
  return (
    <div
      id={id}
      style={{
        ...style,
        width: "80px",
        height: "50px",
        border: "2px solid white",
        borderRadius: "5px",
        position: "relative",
        display: "flex",
        alignItems: "center",
      }}
    >
      {/* <div
        style={{
          width: "10px",
          height: "20px",
          border: "2px solid white",
          position: "absolute",
          right: "0px",
        }}
      ></div> */}
      {/* {Array.from({ length: 4 }).map((_, i) => (
        <div
          key={i}
          style={{
            flex: 1,
            marginLeft: i > 0 ? "2px" : 0,
            backgroundColor: i < filled ? "green" : "transparent",
            borderRadius: "2px",
          }}
        />
      ))} */}
      <div
        id={id + "level1"}
        style={{
          width: "18px",
          height: "47px",
          position: "relative",
          left: "2px",
          backgroundColor: "green",
          borderRadius: "2px",
          display: 0 < value ? "block" : "none",
        }}
      ></div>
      <div
        id={id + "level2"}
        style={{
          width: "18px",
          height: "47px",
          position: "relative",
          left: "4px",
          backgroundColor: "green",
          borderRadius: "2px",
          display: 25 < value ? "block" : "none",
        }}
      ></div>
      <div
        id={id + "level3"}
        style={{
          width: "18px",
          height: "47px",
          position: "relative",
          left: "6px",
          backgroundColor: "green",
          borderRadius: "2px",
          display: 50 < value ? "block" : "none",
        }}
      ></div>
      <div
        id={id + "level4"}
        style={{
          width: "18px",
          height: "47px",
          position: "relative",
          left: "8px",
          backgroundColor: "green",
          borderRadius: "2px",
          display: 75 < value ? "block" : "none",
        }}
      ></div>
    </div>
  );
};

export default Battery;
