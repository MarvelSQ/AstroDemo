import { useState } from "react";

function Main() {
  const [state, setState] = useState("haha");

  return (
    <div
      onClick={() => {
        setState(state + "1");
      }}
    >
      something: {state}
    </div>
  );
}

export default Main;
