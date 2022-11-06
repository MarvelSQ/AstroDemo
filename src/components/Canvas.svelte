<script lang="ts">
  import { Action, initCanvas } from "../features/canvas";
  import { onMount } from "svelte";

  const Actions = [
    { name: "Rect", value: Action.Rect },
    { name: "Circle", value: Action.Circle },
    { name: "Path", value: Action.Path },
    { name: "Move", value: Action.Move },
    { name: "Select", value: Action.Select },
    { name: "Text", value: Action.Text },
  ];

  let activeAction = Action.Move;

  function handleActionChange(action: Action) {
    activeAction = action;
  }

  let canvasHeight = 0;
  let canvasWidth = 0;
  let canvas: HTMLCanvasElement | null = null;

  let handler: ReturnType<typeof initCanvas>;

  onMount(() => {
    if (canvas) {
      handler = initCanvas(canvas);
      handler.setAction(activeAction);
    }
  });

  $: {
    if (handler) {
      handler.setAction(activeAction);
    }
  }
</script>

<div class="toolbar">
  {#each Actions as item}
    <button
      class={`action ${activeAction === item.value ? "active" : ""}`}
      on:click={() => handleActionChange(item.value)}
    >
      {item.name}
    </button>
  {/each}
</div>
<canvas
  class={`paint ${activeAction}`}
  bind:this={canvas}
  bind:clientHeight={canvasHeight}
  bind:clientWidth={canvasWidth}
/>

<style>
  .toolbar {
    display: grid;

    grid-template-columns: repeat(5, 1fr);
  }

  .action {
    /* reset button styles */
    border: none;

    line-height: 60px;

    background-color: #efefef;
    color: #888;
    text-align: center;

    cursor: pointer;
  }

  .action.active {
    color: #333;
    background-color: #f5f5f5;
  }

  .paint {
    height: 400px;
    width: 100%;

    background-color: #fff;
  }

  .paint.Move {
    cursor: move;
  }

  .paint.Path {
    cursor: crosshair;
  }

  .paint.Circle {
    cursor: crosshair;
  }

  .paint.Rect {
    cursor: crosshair;
  }

  .paint.Select {
    cursor: pointer;
  }
</style>
