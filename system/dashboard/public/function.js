// Initializes the Plotly 3D scatter plot
function initPlotly3D() {
  const radarDiv = document.getElementById("radar3D");
  if (!radarDiv || typeof Plotly === "undefined") {
    console.error("Plotly container or library not found.");
    return false;
  }
  try {
    const origin = { x: 0, y: 0, z: 0 };
    let initX = 0,
      initY = 0,
      initZ = 0;
    let initMarkerSize = convertRadiusToPlotlySize(MIN_RADIUS);
    const radarTrace = {
      x: [initX],
      y: [initY],
      z: [initZ],
      mode: "markers",
      marker: { size: initMarkerSize, color: "red" },
      type: "scatter3d",
      name: "Radar",
    };
    const originTrace = {
      x: [origin.x],
      y: [origin.y],
      z: [origin.z],
      mode: "markers+text",
      marker: { size: 8, color: "black" },
      text: ["O"],
      textposition: "top center",
      type: "scatter3d",
      name: "Origin",
    };
    const layout = {
      margin: { l: 0, r: 0, b: 0, t: 0 },
      scene: {
        aspectmode: "cube",
        xaxis: {
          title: "X",
          range: [0, ROOM_SIZE],
          backgroundcolor: "rgb(230, 230,230)",
          gridcolor: "rgb(255, 255, 255)",
          showbackground: true,
          zerolinecolor: "rgb(0, 0, 0)",
        },
        yaxis: {
          title: "Y",
          range: [0, ROOM_SIZE],
          backgroundcolor: "rgb(230, 230,230)",
          gridcolor: "rgb(255, 255, 255)",
          showbackground: true,
          zerolinecolor: "rgb(0, 0, 0)",
        },
        zaxis: {
          title: "Z",
          range: [ROOM_SIZE, 0],
          backgroundcolor: "rgb(230, 230,230)",
          gridcolor: "rgb(255, 255, 255)",
          showbackground: true,
          zerolinecolor: "rgb(0, 0, 0)",
        },
      },
      paper_bgcolor: "#f4f7f9",
      plot_bgcolor: "#f4f7f9",
    };
    const config = { responsive: true, displayModeBar: false };
    Plotly.newPlot("radar3D", [radarTrace, originTrace], layout, config);
    radarPlotlyInitialized = true;
    updateRadarDisplay(initX, initY, initZ, MIN_RADIUS);
    return true;
  } catch (error) {
    console.error("Error initializing Plotly 3D chart:", error);
    return false;
  }
}
