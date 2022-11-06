import { distanceToMultiLines, distanceToRect } from "./util";

export enum Action {
  Rect = "Rect",
  Circle = "Circle",
  Path = "Path",
  Move = "Move",
  Select = "Select",
}

enum ShapeType {
  rect = "rect",
  circle = "circle",
  path = "path",
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
    };

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

  function handleDown(startPoint: { x: number; y: number }) {
    console.log("action", currentAction);
    console.log("position", startPoint);

    const paint = canvas.getContext("2d");
    const rect = canvas.getBoundingClientRect();
    const { width, height } = canvas;
    const scaleX = width / rect.width;
    const scaleY = height / rect.height;

    function getTranslate(): { x: number; y: number } | void {
      const transforms = paint?.getTransform();
      if (transforms) {
        return {
          x: transforms.e,
          y: transforms.f,
        };
      }
    }

    const translate = getTranslate();

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

    function rerenderObj(highlight?: number) {
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
        }
      });
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
          rerenderObj();
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
          rerenderObj();

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
          rerenderObj();

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
      /**
       * 点击位置周围的矩形
       */
      const offset = 10;

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

            if (distance < offset && distance < closestDistance) {
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

            if (distance < offset) {
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

            if (distance < offset) {
              if (distance < closestDistance) {
                closestDistance = distance;
                closestShapeIndex = index;
              }
            }
          }
        });

        return closestShapeIndex;
      }

      const closestShapeIndex = getClosestShapeIndex();

      rerenderObj(closestShapeIndex === -1 ? undefined : closestShapeIndex);
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

  return {
    setAction(action: Action) {
      currentAction = action;
    },
  };
}
