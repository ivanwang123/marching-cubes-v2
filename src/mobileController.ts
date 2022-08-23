import { Vector2 } from "three";
import { UpdateController } from "./types";

export function mobileController(
  canvas: HTMLCanvasElement,
  onChange: (value: Vector2) => void
): UpdateController {
  const coords = new Vector2(canvas.width / 2, canvas.height / 2);
  const anchor = new Vector2(canvas.width / 2, canvas.height / 2);
  const value: Vector2 = new Vector2(0, 0);
  const buttonSize = new Vector2(15, 15);
  let touching = false;

  canvas.style.display = "block";
  canvas.width = canvas.offsetWidth;
  canvas.height = canvas.offsetHeight;

  const getTouchesId = (e: TouchEvent) => {
    let touchesId = 0;

    if (
      e.touches[0].clientX > canvas.offsetLeft &&
      e.touches[0].clientX < canvas.offsetLeft + canvas.width
    ) {
      touchesId = 0;
    } else {
      touchesId = 1;
    }

    return touchesId;
  };

  canvas.addEventListener("touchstart", (e: TouchEvent) => {
    e.preventDefault();

    try {
      anchor.x = e.touches[getTouchesId(e)].clientX - canvas.offsetLeft;
      anchor.y = e.touches[getTouchesId(e)].clientY - canvas.offsetTop;
      coords.x = e.touches[getTouchesId(e)].clientX - canvas.offsetLeft;
      coords.y = e.touches[getTouchesId(e)].clientY - canvas.offsetTop;
    } catch (e) {
      console.error(e);
    }

    touching = true;
  });

  canvas.addEventListener("touchmove", (e: TouchEvent) => {
    e.preventDefault();

    try {
      coords.x = e.touches[getTouchesId(e)].clientX - canvas.offsetLeft;
      coords.y = e.touches[getTouchesId(e)].clientY - canvas.offsetTop;
    } catch (e) {
      console.error(e);
    }
  });

  canvas.addEventListener("touchend", (e: TouchEvent) => {
    e.preventDefault();
    coords.x = canvas.width / 2;
    coords.y = canvas.height / 2;
    touching = false;
  });

  return () => {
    const ctx = canvas.getContext("2d") as CanvasRenderingContext2D;

    if (touching) {
      value.x = -(anchor.x - coords.x);
      value.y = anchor.y - coords.y;

      onChange(value);

      ctx.clearRect(0, 0, canvas.clientWidth, canvas.clientHeight);
      ctx.beginPath();
      ctx.fillStyle = "#00000066";
      ctx.arc(coords.x, coords.y, buttonSize.x, 0, 2 * Math.PI);
      ctx.fill();

      ctx.beginPath();
      ctx.fillStyle = "#000000aa";
      ctx.arc(anchor.x, anchor.y, buttonSize.x / 2, 0, 2 * Math.PI);
      ctx.fill();
    } else {
      ctx.clearRect(0, 0, canvas.clientWidth, canvas.clientHeight);
      value.x = 0;
      value.y = 0;
      onChange(value);
    }
  };
}
