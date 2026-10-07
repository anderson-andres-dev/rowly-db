<script lang="ts" module>
  let nextOutlineId = 0;
</script>

<script lang="ts">
  import { onMount } from "svelte";

  let svg: SVGSVGElement;
  let leftFill: SVGPathElement;
  let rightFill: SVGPathElement;
  let outline: SVGPathElement;
  let gradient: SVGLinearGradientElement;

  onMount(() => {
    const parent = svg.parentElement;
    if (!parent) return;
    const tab: HTMLElement = parent;
    const radius = parseFloat(getComputedStyle(tab).getPropertyValue("--tab-curve")) || 10;
    const k = radius * 0.55228475;
    const gradientId = `tab-outline-${++nextOutlineId}`;
    gradient.id = gradientId;
    outline.setAttribute("stroke", `url(#${gradientId})`);
    let lastWidth = 0;
    let lastHeight = 0;

    // Un solo trazo une las cuatro curvas y los dos laterales. Se recalcula
    // antes de pintar cuando la pestaña cambia de ancho en el mosaico.
    function draw() {
      const { width, height } = tab.getBoundingClientRect();
      const right = radius + width;
      if (!width || !height) return;
      if (Math.abs(width - lastWidth) < 0.01 && Math.abs(height - lastHeight) < 0.01) return;
      lastWidth = width;
      lastHeight = height;

      // El bloque de la pestaña reserva un borde transparente de 1 px.
      // Ubicar el SVG desde su borde exterior evita subpíxeles distintos
      // entre el contorno y el relleno.
      svg.style.left = `${-radius - tab.clientLeft}px`;
      svg.style.top = `${-tab.clientTop}px`;
      svg.style.width = `${width + radius * 2}px`;
      svg.style.height = `${height}px`;
      svg.setAttribute("viewBox", `0 0 ${width + radius * 2} ${height}`);
      leftFill.setAttribute("d", `M0 ${height} C${k} ${height} ${radius} ${height - radius + k} ${radius} ${height - radius} V${height} Z`);
      rightFill.setAttribute("d", `M${right} ${height - radius} C${right} ${height - radius + k} ${right + radius - k} ${height} ${right + radius} ${height} H${right} Z`);
      // El trazo de 1px queda entero dentro del SVG. Centrarlo en y=0
      // dejaba medio borde fuera del viewport y lo repartia entre pixeles.
      const top = 0.5;
      outline.setAttribute("d", `M0 ${height} C${k} ${height} ${radius} ${height - radius + k} ${radius} ${height - radius} V${radius + top} C${radius} ${radius - k + top} ${radius * 2 - k} ${top} ${radius * 2} ${top} H${width} C${width + k} ${top} ${right} ${radius - k + top} ${right} ${radius + top} V${height - radius} C${right} ${height - radius + k} ${right + radius - k} ${height} ${right + radius} ${height}`);
    }

    const observer = new ResizeObserver(draw);
    observer.observe(tab);
    draw();
    return () => observer.disconnect();
  });
</script>

<svg class="tab-outline" bind:this={svg} aria-hidden="true" focusable="false" preserveAspectRatio="none">
  <defs>
    <linearGradient bind:this={gradient} x1="0" y1="0" x2="0" y2="1">
      <stop class="line-start" offset="0" />
      <stop class="line-middle" offset="0.55" />
      <stop class="line-end" offset="1" />
    </linearGradient>
  </defs>
  <path class="fill" bind:this={leftFill} />
  <path class="fill" bind:this={rightFill} />
  <path class="edge" bind:this={outline} stroke="currentColor" />
</svg>

<style>
  .tab-outline {
    position: absolute;
    width: 0;
    height: 0;
    overflow: visible;
    pointer-events: none;
  }

  :global(.drag-ghost) .tab-outline {
    display: none;
  }

  .fill { fill: var(--tab-corner-fill, transparent); }
  .edge {
    fill: none;
    stroke-width: 1;
    stroke-linecap: round;
    stroke-linejoin: round;
    vector-effect: non-scaling-stroke;
  }

  .line-start,
  .line-middle,
  .line-end { stop-color: var(--tab-line, var(--text-secondary)); }
  .line-start { stop-opacity: 1; }
  .line-middle { stop-opacity: var(--tab-line-mid, 0.18); }
  .line-end { stop-opacity: 0; }
</style>
