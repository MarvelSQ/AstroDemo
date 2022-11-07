import { distanceToMultiLines, distanceToRect, inRect } from "./util";

export enum Action {
  Rect = "Rect",
  Circle = "Circle",
  Path = "Path",
  Move = "Move",
  Select = "Select",
  Text = "Text",
}

enum ShapeType {
  rect = "rect",
  circle = "circle",
  path = "path",
  text = "text",
}

type Shape =
  | {
      shape: ShapeType.rect;
      location: {
        x: number;
        y: number;
      };
      width: number;
      height: number;
    }
  | {
      shape: ShapeType.path;
      points: [x: number, y: number][];
    }
  | {
      shape: ShapeType.circle;
      location: {
        x: number;
        y: number;
      };
      radius: number;
    }
  | {
      shape: ShapeType.text;
      location: {
        x: number;
        y: number;
      };
      text: string;
      width: number;
      style: {
        fontFamily: string;
        fontSize: number;
        color: string;
      };
    };

/**
 * 点击位置周围的矩形
 */
const SelectOffset = 10;

export function initCanvas(canvas: HTMLCanvasElement) {
  let currentAction: Action | null = null;

  let renderingObj = {
    current: {
      objs: [] as Shape[],
      border: {
        left: 0,
        top: 0,
        right: 0,
        bottom: 0,
      },
    },
  };

  const rect = canvas.getBoundingClientRect();

  const radio = window.devicePixelRatio;
  canvas.style.touchAction = "none";
  canvas.style.width = `${rect.width}px`;
  canvas.style.height = `${rect.height}px`;
  canvas.width = rect.width * radio;
  canvas.height = rect.height * radio;

  renderingObj.current.border.right = rect.width * radio;
  renderingObj.current.border.bottom = rect.height * radio;
  // get 2d context

  function getTranslate(
    paint: CanvasRenderingContext2D
  ): { x: number; y: number } | void {
    const transforms = paint.getTransform();
    if (transforms) {
      return {
        x: transforms.e,
        y: transforms.f,
      };
    }
  }

  let lastHighlight = -1;

  function handleKeyDown(event: KeyboardEvent) {
    if (currentAction === Action.Select && lastHighlight !== -1) {
      // handle delete
      if (["Delete", "Backspace"].includes(event.key)) {
        const highlightShape = renderingObj.current.objs[lastHighlight];

        // need confirm
        if (
          highlightShape &&
          confirm(`delete Shape[${lastHighlight}] ${highlightShape.shape}？`)
        ) {
          const paint = canvas.getContext("2d");
          if (paint) {
            renderingObj.current.objs.splice(lastHighlight, 1);
            rerenderObj(paint);
          }
        }
      }
    }
  }

  function rerenderObj(paint: CanvasRenderingContext2D, highlight?: number) {
    lastHighlight = highlight ?? -1;

    if (lastHighlight !== -1) {
      window.addEventListener("keydown", handleKeyDown);
    } else {
      window.removeEventListener("keydown", handleKeyDown);
    }

    const { border } = renderingObj.current;
    const safeRange = 100;
    paint?.clearRect(
      border.left - safeRange,
      border.top - safeRange,
      border.right - border.left + safeRange * 2,
      border.bottom - border.top + safeRange * 2
    );

    renderingObj.current.objs.forEach((shape, index) => {
      if (index === highlight) {
        paint && (paint.strokeStyle = "red");
      } else {
        paint && (paint.strokeStyle = "black");
      }
      if (shape.shape === "path") {
        paint?.beginPath();
        const paths = shape.points;
        paths.forEach(([x, y], index) => {
          if (index === 0) {
            paint?.moveTo(x, y);
          } else {
            paint?.lineTo(x, y);
          }
        });
        paint?.stroke();
      } else if (shape.shape === "rect") {
        paint?.strokeRect(
          shape.location.x,
          shape.location.y,
          shape.width,
          shape.height
        );
      } else if (shape.shape === ShapeType.circle) {
        paint?.beginPath();
        paint?.arc(
          shape.location.x,
          shape.location.y,
          shape.radius,
          0,
          Math.PI * 2
        );
        paint?.stroke();
      } else if (shape.shape === ShapeType.text) {
        paint.beginPath();
        if (index === highlight) {
          paint.fillStyle = "red";
        } else {
          paint.fillStyle = "black";
        }
        paint.font = `${shape.style.fontSize * window.devicePixelRatio}px ${
          shape.style.fontFamily
        }`;
        paint.fillText(shape.text, shape.location.x, shape.location.y);
      }
    });
  }

  function handleDown(startPoint: { x: number; y: number }) {
    console.log("action", currentAction);
    console.log("position", startPoint);

    const paint = canvas.getContext("2d");
    const rect = canvas.getBoundingClientRect();
    const { width, height } = canvas;
    const scaleX = width / rect.width;
    const scaleY = height / rect.height;

    const translate = paint && getTranslate(paint);

    const inPaintX = (startPoint.x - rect.left) * scaleX - (translate?.x || 0);
    const inPaintY = (startPoint.y - rect.top) * scaleY - (translate?.y || 0);

    function onNewPoint(point: { x: number; y: number }) {
      const { x, y } = point;

      renderingObj.current.border.top = Math.min(
        renderingObj.current.border.top,
        y
      );

      renderingObj.current.border.left = Math.min(
        renderingObj.current.border.left,
        x
      );

      renderingObj.current.border.right = Math.max(
        renderingObj.current.border.right,
        x
      );

      renderingObj.current.border.bottom = Math.max(
        renderingObj.current.border.bottom,
        y
      );
    }

    if (currentAction === Action.Path) {
      paint?.moveTo(inPaintX, inPaintY);

      const paths = [[inPaintX, inPaintY] as [x: number, y: number]];

      onNewPoint({ x: inPaintX, y: inPaintY });

      function listener(event: MouseEvent | TouchEvent) {
        event.stopPropagation();
        event.preventDefault();

        console.log("mouse move");

        const point = "touches" in event ? event.touches[0] : event;

        requestAnimationFrame(() => {
          const currentInPaintX =
            (point.clientX - rect.left) * scaleX - (translate?.x || 0);
          const currentInPaintY =
            (point.clientY - rect.top) * scaleY - (translate?.y || 0);

          paint?.lineTo(currentInPaintX, currentInPaintY);
          const lastPoint = paths[paths.length - 1];
          if (
            lastPoint[0] !== currentInPaintX ||
            lastPoint[1] !== currentInPaintY
          ) {
            paths.push([currentInPaintX, currentInPaintY]);
          }
          paint?.stroke();

          onNewPoint({ x: currentInPaintX, y: currentInPaintY });
        });
      }

      function removeListener() {
        renderingObj.current.objs.push({
          shape: ShapeType.path,
          points: paths,
        });
        window.removeEventListener("mousemove", listener);
        window.removeEventListener("touchmove", listener);
        window.removeEventListener("mouseup", removeListener);
        window.removeEventListener("touchend", removeListener);
      }

      window.addEventListener("mousemove", listener);
      window.addEventListener("touchmove", listener);
      window.addEventListener("mouseup", removeListener);
      window.addEventListener("touchend", removeListener);
    } else if (currentAction === Action.Move) {
      const startX = startPoint.x;
      const startY = startPoint.y;

      let lastX = startX;
      let lastY = startY;

      function listener(event: MouseEvent | TouchEvent) {
        const { clientX, clientY } =
          "touches" in event ? event.touches[0] : event;

        paint?.translate(
          (clientX - lastX) * scaleX,
          (clientY - lastY) * scaleY
        );
        lastX = clientX;
        lastY = clientY;

        requestAnimationFrame(() => {
          paint && rerenderObj(paint);
        });
      }

      function removeListener() {
        window.removeEventListener("mousemove", listener);
        window.removeEventListener("touchmove", listener);
        window.removeEventListener("mouseup", removeListener);
        window.removeEventListener("touchend", removeListener);
      }

      window.addEventListener("mousemove", listener);
      window.addEventListener("touchmove", listener);
      window.addEventListener("mouseup", removeListener);
      window.addEventListener("touchend", removeListener);
    } else if (currentAction === Action.Rect) {
      paint?.moveTo(inPaintX, inPaintY);

      const startX = startPoint.x;
      const startY = startPoint.y;

      onNewPoint({ x: inPaintX, y: inPaintY });

      let lastWidth = 0;
      let lastHeight = 0;

      function renderRect(event: MouseEvent | TouchEvent) {
        const point = "touches" in event ? event.touches[0] : event;
        requestAnimationFrame(() => {
          paint && rerenderObj(paint);

          const width = (point.clientX - startX) * scaleX;
          const height = (point.clientY - startY) * scaleY;

          lastWidth = width;
          lastHeight = height;

          paint?.strokeRect(inPaintX, inPaintY, width, height);
        });
      }

      function removeListener() {
        if (lastWidth && lastHeight) {
          console.log("add rect", inPaintX, inPaintY, lastWidth, lastHeight);

          renderingObj.current.objs.push({
            shape: ShapeType.rect,
            location: {
              x: inPaintX,
              y: inPaintY,
            },
            width: lastWidth,
            height: lastHeight,
          });

          onNewPoint({
            x: inPaintX + lastWidth,
            y: inPaintY + lastHeight,
          });
        }

        window.removeEventListener("mousemove", renderRect);
        window.removeEventListener("touchmove", renderRect);
        window.removeEventListener("mouseup", removeListener);
        window.removeEventListener("touchend", removeListener);
      }

      window.addEventListener("mousemove", renderRect);
      window.addEventListener("touchmove", renderRect);
      window.addEventListener("mouseup", removeListener);
      window.addEventListener("touchend", removeListener);
    } else if (currentAction === Action.Circle) {
      paint?.moveTo(inPaintX, inPaintY);

      const startX = startPoint.x;
      const startY = startPoint.y;

      onNewPoint({ x: inPaintX, y: inPaintY });

      let lastRadius = 0;
      let horizontal = 1;
      let vertical = 1;

      function renderRect(event: MouseEvent | TouchEvent) {
        const point = "touches" in event ? event.touches[0] : event;
        requestAnimationFrame(() => {
          paint && rerenderObj(paint);

          const width = (point.clientX - startX) * scaleX;
          const height = (point.clientY - startY) * scaleY;

          horizontal = width > 0 ? 1 : -1;
          vertical = height > 0 ? 1 : -1;

          lastRadius = Math.min(Math.abs(width), Math.abs(height));

          paint?.beginPath();

          paint?.arc(
            inPaintX + (lastRadius * horizontal) / 2,
            inPaintY + (lastRadius * vertical) / 2,
            lastRadius / 2,
            0,
            2 * Math.PI
          );

          paint?.stroke();
        });
      }

      function removeListener() {
        if (lastRadius) {
          console.log("add circle", inPaintX, inPaintY, lastRadius);

          renderingObj.current.objs.push({
            shape: ShapeType.circle,
            location: {
              x: inPaintX + (lastRadius * horizontal) / 2,
              y: inPaintY + (lastRadius * vertical) / 2,
            },
            radius: lastRadius / 2,
          });

          onNewPoint({
            x: inPaintX + lastRadius,
            y: inPaintY + lastRadius,
          });
        }

        window.removeEventListener("mousemove", renderRect);
        window.removeEventListener("touchmove", renderRect);
        window.removeEventListener("mouseup", removeListener);
        window.removeEventListener("touchend", removeListener);
      }

      window.addEventListener("mousemove", renderRect);
      window.addEventListener("touchmove", renderRect);
      window.addEventListener("mouseup", removeListener);
      window.addEventListener("touchend", removeListener);
    } else if (currentAction === Action.Select) {
      function getClosestShapeIndex() {
        const shapes = renderingObj.current.objs;

        let closestShapeIndex = -1;
        let closestDistance = Infinity;

        shapes.forEach((shape, index) => {
          if (shape.shape === "rect") {
            const { x, y } = shape.location;
            const { width, height } = shape;

            const distance = distanceToRect(
              {
                x: inPaintX,
                y: inPaintY,
              },
              {
                x,
                y,
                width,
                height,
              }
            );

            console.log("rect[", index, "]", distance);

            if (distance < SelectOffset && distance < closestDistance) {
              closestDistance = distance;
              closestShapeIndex = index;
            }
          } else if (shape.shape === "path") {
            const paths = shape.points;

            const distance = distanceToMultiLines(
              {
                x: inPaintX,
                y: inPaintY,
              },
              paths.map(([x, y]) => ({ x, y }))
            );

            console.log("path[", index, "]", distance);

            if (distance < SelectOffset) {
              if (distance < closestDistance) {
                closestDistance = distance;
                closestShapeIndex = index;
              }
            }
          } else if (shape.shape === ShapeType.circle) {
            const { x, y } = shape.location;
            const { radius } = shape;

            const toCenter = Math.hypot(x - inPaintX, y - inPaintY);

            const distance = Math.abs(toCenter - radius);

            console.log("circle[", index, "]", distance);

            if (distance < SelectOffset) {
              if (distance < closestDistance) {
                closestDistance = distance;
                closestShapeIndex = index;
              }
            }
          } else if (shape.shape === ShapeType.text) {
            const { x, y } = shape.location;
            const {
              width,
              style: { fontSize },
            } = shape;

            const height = fontSize * window.devicePixelRatio;

            const insideTextRect = inRect(
              {
                x: inPaintX,
                y: inPaintY,
              },
              {
                x,
                y: y - height,
                width,
                height,
              }
            );

            if (insideTextRect) {
              closestDistance = 0;
              closestShapeIndex = index;
            }
          }
        });

        return closestShapeIndex;
      }

      const closestShapeIndex = getClosestShapeIndex();

      paint &&
        rerenderObj(
          paint,
          closestShapeIndex === -1 ? undefined : closestShapeIndex
        );
    }
  }

  function handleText(startPoint: { x: number; y: number }) {
    const paint = canvas.getContext("2d");
    const rect = canvas.getBoundingClientRect();

    if (paint) {
      const text = prompt("请输入文字");
      const scaleX = window.devicePixelRatio;
      const scaleY = window.devicePixelRatio;
      const translate = getTranslate(paint);
      const inPaintX =
        (startPoint.x - rect.left) * scaleX - (translate?.x || 0);
      const inPaintY = (startPoint.y - rect.top) * scaleY - (translate?.y || 0);

      if (text) {
        const fontSize = 40;

        const fontFamily = "sans-serif";

        paint.font = `${fontSize * window.devicePixelRatio}px sans-serif`;

        const size = paint.measureText(text);

        renderingObj.current.objs.push({
          shape: ShapeType.text,
          location: {
            x: inPaintX,
            y: inPaintY,
          },
          text,
          style: {
            fontFamily,
            fontSize,
            color: "#000",
          },
          width: size.width,
        });

        rerenderObj(paint);
      }
    }
  }

  // add mouse down listener
  canvas.addEventListener("mousedown", (e) => {
    // get mouse position
    handleDown({
      x: e.clientX,
      y: e.clientY,
    });
  });

  // add touchdown listener
  canvas.addEventListener("touchstart", (e) => {
    // get touch position
    handleDown({
      x: e.touches[0].clientX,
      y: e.touches[0].clientY,
    });
  });

  canvas.addEventListener("click", (e) => {
    if (currentAction === Action.Text) {
      handleText({
        x: e.clientX,
        y: e.clientY,
      });
    } else if (currentAction === Action.Select) {
    }
  });

  canvas.addEventListener("dblclick", (e) => {
    if (currentAction === Action.Select && lastHighlight !== -1) {
      const highlightShape = renderingObj.current.objs[lastHighlight];
      const paint = canvas.getContext("2d");
      if (paint && highlightShape.shape === ShapeType.text) {
        const text = prompt("请输入文字", highlightShape.text);
        if (text) {
          highlightShape.text = text;

          paint.font = `${
            highlightShape.style.fontSize * window.devicePixelRatio
          }px ${highlightShape.style.fontFamily}`;

          const width = paint.measureText(text).width;

          highlightShape.width = width;

          rerenderObj(paint);
        }
      }
    }
  });

  return {
    setAction(action: Action) {
      currentAction = action;
    },
  };
}
