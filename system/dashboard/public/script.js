document.addEventListener("DOMContentLoaded", () => {
  // --- Constants and Config ---
  const MAX_HISTORY_POINTS = 30; // Maximum number of points to show in history charts
  const ROOM_SIZE = 500; // Size of the room dimensions (used for axis limits)
  const MIN_RADIUS = 0.5; // Minimum expected radius value from sensor
  const MAX_RADIUS = 50; // Maximum expected radius value from sensor
  const MIN_POINT_RADIUS = 2; // Minimum visual size for points in Chart.js
  const MAX_POINT_RADIUS = 8; // Maximum visual size for points in Chart.js
  const chartColors = {
    x: "rgb(255, 0, 0)",
    y: "rgb(0, 255, 0)",
    z: "rgb(0, 0, 255)",
  }; // Colors for time series charts
  const bubbleColorX = "rgba(255, 0, 0, 0.6)"; // Color for YX bubble chart
  const bubbleColorY = "rgba(0, 255, 0, 0.6)"; // Color for ZY bubble chart
  const bubbleColorZ = "rgba(0, 0, 255, 0.6)"; // Color for XZ bubble chart
  const bubbleBorderColor = "rgb(108, 117, 125)"; // Border color for bubble charts

  // --- Global Variables ---
  let xChart, yChart, zChart; // Chart.js instances for time series
  let yxBubbleChart, zyBubbleChart, xzBubbleChart; // Chart.js instances for bubble charts
  let map; // Leaflet map instance
  let radarHistory = []; // Array to store recent radar data points
  let radarPlotlyInitialized = false; // Flag to check if Plotly chart is initialized

  // --- Helper Functions ---
  // Maps sensor radius (r) to visual point radius for Chart.js line charts
  function mapRtoPointRadius(r) {
    const normalizedR = Math.max(
      0,
      Math.min(1, (r - MIN_RADIUS) / (MAX_RADIUS - MIN_RADIUS))
    );
    const pointRadius =
      MIN_POINT_RADIUS + normalizedR * (MAX_POINT_RADIUS - MIN_POINT_RADIUS);
    return Math.max(MIN_POINT_RADIUS, Math.min(MAX_POINT_RADIUS, pointRadius));
  }
  // Maps sensor radius (r) to marker size for Plotly 3D chart
  function convertRadiusToPlotlySize(r) {
    // Simple linear mapping (adjust coefficients as needed for visual preference)
    // Example: maps r=[0.5, 50] to size=[~3, ~10]
    const scale = (10 - 3) / (MAX_RADIUS - MIN_RADIUS);
    const offset = 3 - scale * MIN_RADIUS;
    return Math.max(3, scale * r + offset); // Ensure minimum size
  }

  // --- Initialization Functions ---
  // Initializes the three time series line charts (X, Y, Z vs. Time)
  function initTimeSeriesCharts() {
    const commonOptions = (label, minVal, maxVal, showTime = true) => ({
      responsive: true,
      maintainAspectRatio: false,
      animation: false, // Disable animation for real-time updates
      interaction: { mode: "index", intersect: false }, // Tooltip behavior
      scales: {
        x: {
          // Time axis
          ticks: {
            display: showTime,
            maxRotation: 0,
            autoSkip: true,
            maxTicksLimit: 6,
            font: { size: 9 },
          },
          grid: { display: true },
        },
        y: {
          // Value axis (X, Y, or Z)
          title: { display: true, text: label, font: { size: 10 } },
          min: minVal,
          max: maxVal,
          ticks: { stepSize: 100, font: { size: 9 } },
          grid: { display: true },
        },
      },
      plugins: {
        legend: { display: false },
        tooltip: {
          bodyFont: { size: 10 },
          titleFont: { size: 10 },
          displayColors: false,
        },
      },
    });
    // Function to dynamically set point radius based on 'r' value stored in dataset
    const pointRadiusFunc = (context) => {
      const idx = context.dataIndex;
      return (
        (context.dataset.pointRadii && context.dataset.pointRadii[idx]) || 0
      ); // Default to 0 if no radius data
    };
    const pointOptions = {
      elements: {
        point: {
          radius: pointRadiusFunc,
          hoverRadius: (ctx) => pointRadiusFunc(ctx) + 2,
          borderWidth: 0,
        },
      },
    };

    const xCtx = document.getElementById("xChart")?.getContext("2d");
    const yCtx = document.getElementById("yChart")?.getContext("2d");
    const zCtx = document.getElementById("zChart")?.getContext("2d");
    let success = true; // Flag to track initialization success

    // Create X chart
    if (xCtx)
      xChart = new Chart(xCtx, {
        type: "line",
        data: {
          labels: [],
          datasets: [
            {
              label: "X",
              data: [],
              borderColor: chartColors.x,
              borderWidth: 1.5,
              pointRadii: [],
            },
          ],
        },
        options: { ...commonOptions("X", 0, ROOM_SIZE), ...pointOptions },
      });
    else {
      console.error("xChart canvas not found");
      success = false;
    }
    // Create Y chart
    if (yCtx)
      yChart = new Chart(yCtx, {
        type: "line",
        data: {
          labels: [],
          datasets: [
            {
              label: "Y",
              data: [],
              borderColor: chartColors.y,
              borderWidth: 1.5,
              pointRadii: [],
            },
          ],
        },
        options: { ...commonOptions("Y", 0, ROOM_SIZE), ...pointOptions },
      });
    else {
      console.error("yChart canvas not found");
      success = false;
    }
    // Create Z chart
    if (zCtx)
      zChart = new Chart(zCtx, {
        type: "line",
        data: {
          labels: [],
          datasets: [
            {
              label: "Z",
              data: [],
              borderColor: chartColors.z,
              borderWidth: 1.5,
              pointRadii: [],
            },
          ],
        },
        options: { ...commonOptions("Z", 0, ROOM_SIZE), ...pointOptions },
      });
    else {
      console.error("zChart canvas not found");
      success = false;
    }

    return success;
  }

  // Initializes the three bubble charts (YX, ZY, XZ correlations)
  function initBubbleCharts() {
    const commonBubbleOptions = (xLabel, yLabel, xMin, xMax, yMin, yMax) => ({
      responsive: true,
      maintainAspectRatio: false,
      animation: false, // Disable animation
      scales: {
        x: {
          // Horizontal axis
          min: xMin,
          max: xMax,
          title: { display: true, text: xLabel, font: { size: 10 } },
          ticks: { stepSize: 100, font: { size: 9 } },
          grid: { display: true },
        },
        y: {
          // Vertical axis
          min: yMin,
          max: yMax,
          title: { display: true, text: yLabel, font: { size: 10 } },
          ticks: { stepSize: 100, font: { size: 9 } },
          grid: { display: true },
        },
      },
      plugins: {
        legend: { display: false },
        tooltip: { enabled: true, callbacks: {} },
      }, // Enable tooltips, callbacks added below
    });

    // Custom tooltip formatter for bubble charts
    const tooltipCallback = (context) => {
      const dataPoint = context.raw; // The {x, y, r} data point
      const lastHistory = radarHistory[radarHistory.length - 1]; // Get the most recent full data point
      let original_r = lastHistory ? lastHistory.r : 0; // Extract the original 'r' value
      // Format tooltip based on which chart it is
      if (context.chart.canvas.id === "yxBubbleChart")
        return `Y: ${dataPoint.x.toFixed(1)}, X: ${dataPoint.y.toFixed(
          1
        )}, r: ${original_r.toFixed(1)}`;
      if (context.chart.canvas.id === "zyBubbleChart")
        return `Z: ${dataPoint.x.toFixed(1)}, Y: ${dataPoint.y.toFixed(
          1
        )}, r: ${original_r.toFixed(1)}`;
      if (context.chart.canvas.id === "xzBubbleChart")
        return `X: ${dataPoint.x.toFixed(1)}, Z: ${dataPoint.y.toFixed(
          1
        )}, r: ${original_r.toFixed(1)}`;
      return ""; // Default empty tooltip
    };

    const yxCtx = document.getElementById("yxBubbleChart")?.getContext("2d");
    const zyCtx = document.getElementById("zyBubbleChart")?.getContext("2d");
    const xzCtx = document.getElementById("xzBubbleChart")?.getContext("2d");
    let success = true; // Flag for initialization success
    const initialBubblePoint = {
      x: 0,
      y: 0,
      r: convertRadiusToPlotlySize(MIN_RADIUS),
    }; // Initial dummy point

    // Create YX bubble chart
    const yxOptions = commonBubbleOptions("Y", "X", 0, ROOM_SIZE, 0, ROOM_SIZE);
    yxOptions.plugins.tooltip.callbacks.label = tooltipCallback; // Assign custom tooltip
    if (yxCtx)
      yxBubbleChart = new Chart(yxCtx, {
        type: "bubble",
        data: {
          datasets: [
            {
              label: "YX",
              data: [initialBubblePoint],
              backgroundColor: bubbleColorX,
              borderColor: bubbleBorderColor,
            },
          ],
        },
        options: yxOptions,
      });
    else {
      console.error("yxBubbleChart canvas not found");
      success = false;
    }

    // Create ZY bubble chart
    const zyOptions = commonBubbleOptions("Z", "Y", 0, ROOM_SIZE, 0, ROOM_SIZE);
    zyOptions.plugins.tooltip.callbacks.label = tooltipCallback; // Assign custom tooltip
    if (zyCtx)
      zyBubbleChart = new Chart(zyCtx, {
        type: "bubble",
        data: {
          datasets: [
            {
              label: "ZY",
              data: [initialBubblePoint],
              backgroundColor: bubbleColorY,
              borderColor: bubbleBorderColor,
            },
          ],
        },
        options: zyOptions,
      });
    else {
      console.error("zyBubbleChart canvas not found");
      success = false;
    }

    // Create XZ bubble chart
    const xzOptions = commonBubbleOptions("X", "Z", 0, ROOM_SIZE, 0, ROOM_SIZE);
    xzOptions.plugins.tooltip.callbacks.label = tooltipCallback; // Assign custom tooltip
    if (xzCtx)
      xzBubbleChart = new Chart(xzCtx, {
        type: "bubble",
        data: {
          datasets: [
            {
              label: "XZ",
              data: [initialBubblePoint],
              backgroundColor: bubbleColorZ,
              borderColor: bubbleBorderColor,
            },
          ],
        },
        options: xzOptions,
      });
    else {
      console.error("xzBubbleChart canvas not found");
      success = false;
    }

    return success;
  }

  // Initializes the Plotly 3D scatter plot
  function initPlotly3D() {
    const radarDiv = document.getElementById("radar3D");
    if (!radarDiv || typeof Plotly === "undefined") {
      console.error("Plotly container or library not found.");
      return false;
    }
    try {
      const origin = { x: 0, y: 0, z: 0 }; // Origin point
      // Initial values for the first point shown
      let initX = 0,
        initY = 0,
        initZ = 0;
      let initMarkerSize = convertRadiusToPlotlySize(MIN_RADIUS); // Use helper function for size

      // Data trace for the radar point
      const radarTrace = {
        x: [initX],
        y: [initY],
        z: [initZ],
        mode: "markers",
        marker: { size: initMarkerSize, color: "red" }, // Set initial size and color
        type: "scatter3d",
        name: "Radar",
      };
      // Data trace for the origin point (optional, for reference)
      const originTrace = {
        x: [origin.x],
        y: [origin.y],
        z: [origin.z],
        mode: "markers+text", // Show marker and text
        marker: { size: 8, color: "black" },
        text: ["O"],
        textposition: "top center", // Label the origin
        type: "scatter3d",
        name: "Origin",
      };

      // Layout configuration for the 3D scene
      const layout = {
        margin: { l: 0, r: 0, b: 0, t: 0 }, // Minimize margins
        scene: {
          aspectmode: "cube", // Keep aspect ratio cubic
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
          // *** Z-AXIS MODIFICATION HERE ***
          zaxis: {
            title: "Z (Hướng xuống)", // Updated title
            range: [ROOM_SIZE, 0], // Reversed range [max, min] to make it point down
            backgroundcolor: "rgb(230, 230,230)",
            gridcolor: "rgb(255, 255, 255)",
            showbackground: true,
            zerolinecolor: "rgb(0, 0, 0)",
          },
        },
        paper_bgcolor: "#f4f7f9", // Match body background
        plot_bgcolor: "#f4f7f9", // Match body background
      };
      const config = { responsive: true, displayModeBar: false }; // Make responsive, hide mode bar

      // Create the Plotly chart
      Plotly.newPlot("radar3D", [radarTrace, originTrace], layout, config);
      radarPlotlyInitialized = true; // Mark as initialized
      updateRadarDisplay(initX, initY, initZ, MIN_RADIUS); // Update the text display initially
      return true;
    } catch (error) {
      console.error("Error initializing Plotly 3D chart:", error);
      return false;
    }
  }

  // Updates the text display showing current coordinates
  function updateRadarDisplay(x, y, z, r) {
    const el = document.getElementById("radarValues");
    if (el) {
      el.innerText = `Tọa độ: x: ${x.toFixed(1)}, y: ${y.toFixed(
        1
      )}, z: ${z.toFixed(1)}, r: ${r.toFixed(1)}`;
    }
  }

  // Initializes the Leaflet map
  function initMap() {
    const mapDiv = document.getElementById("map");
    if (!mapDiv) {
      console.error("Map container not found");
      return false;
    }
    try {
      const defaultCoords = [10.7769, 106.7009]; // Default to HCMC center
      const defaultZoom = 15; // Default zoom level
      // Remove existing map if re-initializing
      if (map) {
        map.remove();
        map = null;
      }
      // Create map instance
      map = L.map("map", { zoomControl: false }).setView(
        defaultCoords,
        defaultZoom
      );
      // Add OpenStreetMap tile layer
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 18,
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      }).addTo(map);
      // Add scale control
      L.control.scale({ imperial: false }).addTo(map);
      // Add zoom control to bottom right
      L.control.zoom({ position: "bottomright" }).addTo(map);
      // Add a default marker
      L.marker(defaultCoords)
        .addTo(map)
        .bindPopup("Trung tâm TP.HCM (Mặc định)")
        .openPopup();

      // Try to get user's current location
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            // Success callback
            const realCoords = [
              position.coords.latitude,
              position.coords.longitude,
            ];
            map.setView(realCoords, defaultZoom); // Center map on user location
            // Remove default marker and add user location marker
            map.eachLayer((layer) => {
              if (layer instanceof L.Marker) map.removeLayer(layer);
            });
            L.marker(realCoords)
              .addTo(map)
              .bindPopup("Vị trí của bạn")
              .openPopup();
          },
          (error) => {
            // Error callback
            console.warn("Không thể lấy vị trí thực tế:", error.message);
            showMapError(error); // Display error message on map
          },
          { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 } // Geolocation options
        );
      } else {
        // Geolocation not supported
        mapDiv.innerHTML =
          "<p style='text-align:center; padding: 10px;'>Geolocation không được hỗ trợ.</p>";
      }
    } catch (error) {
      // Catch any other map initialization errors
      console.error("Error initializing map:", error);
      mapDiv.innerHTML =
        "<p style='text-align:center; padding: 10px; color: red;'>Lỗi khởi tạo bản đồ.</p>";
      return false;
    }
    return true;
  }

  // --- Event Handlers ---
  // Displays geolocation errors on the map overlay
  function showMapError(error) {
    const mapDiv = document.getElementById("map");
    if (!mapDiv) return;
    let message = "Lỗi không xác định khi lấy vị trí.";
    // Determine error message based on error code
    switch (error.code) {
      case error.PERMISSION_DENIED:
        message = "Đã từ chối truy cập vị trí.";
        break;
      case error.POSITION_UNAVAILABLE:
        message = "Thông tin vị trí không khả dụng.";
        break;
      case error.TIMEOUT:
        message = "Yêu cầu vị trí hết hạn.";
        break;
      case error.UNKNOWN_ERROR:
        message = "Lỗi không rõ.";
        break;
    }
    // Create or update an error overlay div
    const errorDivId = "map-error-overlay";
    let errorDiv = document.getElementById(errorDivId);
    if (!errorDiv) {
      errorDiv = document.createElement("div");
      errorDiv.id = errorDivId;
      // Style the overlay
      errorDiv.style.cssText =
        "position: absolute; top: 0; left: 0; width: 100%; background: rgba(255,0,0,0.7); color: white; padding: 5px; text-align: center; z-index: 1000; font-size: 0.8em;";
      mapDiv.style.position = "relative"; // Ensure map container is positioned
      mapDiv.appendChild(errorDiv);
    }
    errorDiv.textContent = message; // Set the error message text
    console.error("Geolocation Error:", error.message);
  }

  // --- WebSocket Connection and Data Handling ---
  // Establish WebSocket connection to the server running on the same host
  const ws = new WebSocket(`ws://${window.location.host}`);

  ws.onopen = () => {
    console.log("WebSocket connection established");
  };
  ws.onerror = (error) => {
    console.error("WebSocket Error:", error);
    // Display error message to the user
    document.body.insertAdjacentHTML(
      "afterbegin",
      `<p style='background:orange; color:black; padding:10px; text-align:center; font-weight:bold;'>Lỗi: Mất kết nối WebSocket đến server.</p>`
    );
  };
  ws.onclose = () => {
    console.log("WebSocket connection closed");
    // Display connection closed message
    document.body.insertAdjacentHTML(
      "afterbegin",
      `<p style='background:red; color:white; padding:10px; text-align:center; font-weight:bold;'>Lỗi: Kết nối WebSocket đã đóng.</p>`
    );
  };

  // Handle incoming messages from the WebSocket server
  ws.onmessage = (event) => {
    try {
      const message = JSON.parse(event.data); // Parse the JSON data
      // Extract coordinates and radius
      const newX = message.x;
      const newY = message.y;
      const newZ = message.z;
      const newR = message.r; // Original radius value

      // Validate data types
      if (
        typeof newX === "number" &&
        typeof newY === "number" &&
        typeof newZ === "number" &&
        typeof newR === "number"
      ) {
        // Calculate visual sizes based on radius
        const bubbleRadius = mapRtoPointRadius(newR); // Use mapRtoPointRadius for consistency in bubble charts
        const pointRadius = mapRtoPointRadius(newR); // For time series charts
        // const markerSize3D = convertRadiusToPlotlySize(newR); // Use dedicated function for Plotly size
        const timeLabel = new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        }); // Timestamp for charts

        // 1. Update Plotly 3D Radar
        if (radarPlotlyInitialized && typeof Plotly !== "undefined") {
          // Use Plotly.restyle for efficient updates
          Plotly.restyle(
            "radar3D",
            {
              x: [[newX]], // Data needs to be nested arrays
              y: [[newY]],
              z: [[newZ]],
              "marker.size": [[newR]], // Update marker size
            },
            [0]
          ); // Target the first trace (index 0, which is radarTrace)
        }
        updateRadarDisplay(newX, newY, newZ, newR); // Update the coordinate text display

        // 2. Update Bubble Charts
        // Update the single data point in each bubble chart
        if (yxBubbleChart) {
          yxBubbleChart.data.datasets[0].data[0] = {
            x: newY,
            y: newX,
            r: bubbleRadius,
          };
          yxBubbleChart.update("none");
        } // 'none' prevents animation
        if (zyBubbleChart) {
          zyBubbleChart.data.datasets[0].data[0] = {
            x: newZ,
            y: newY,
            r: bubbleRadius,
          };
          zyBubbleChart.update("none");
        }
        if (xzBubbleChart) {
          xzBubbleChart.data.datasets[0].data[0] = {
            x: newX,
            y: newZ,
            r: bubbleRadius,
          };
          xzBubbleChart.update("none");
        }

        // 3. Update Time Series Charts
        const charts = [xChart, yChart, zChart];
        const dataValues = [newX, newY, newZ];
        charts.forEach((chart, index) => {
          if (chart) {
            try {
              // Add new data point
              chart.data.labels.push(timeLabel);
              chart.data.datasets[0].data.push(dataValues[index]);
              // Ensure pointRadii array exists and add new radius
              if (!chart.data.datasets[0].pointRadii)
                chart.data.datasets[0].pointRadii = [];
              chart.data.datasets[0].pointRadii.push(pointRadius);

              // Remove oldest data point if history limit is reached
              if (chart.data.labels.length > MAX_HISTORY_POINTS) {
                chart.data.labels.shift();
                chart.data.datasets[0].data.shift();
                chart.data.datasets[0].pointRadii?.shift(); // Use optional chaining
              }
              chart.update("none"); // Update chart without animation
            } catch (chartError) {
              console.error(
                `Lỗi cập nhật biểu đồ ${chart.canvas.id}:`,
                chartError
              );
            }
          }
        });

        // 4. Update Radar History (used for bubble chart tooltips)
        const newDataPoint = {
          time: timeLabel,
          x: newX,
          y: newY,
          z: newZ,
          r: newR,
          pointRadius: pointRadius,
        };
        radarHistory.push(newDataPoint);
        if (radarHistory.length > MAX_HISTORY_POINTS) radarHistory.shift(); // Keep history size limited
      } else {
        console.warn("Dữ liệu nhận được từ WebSocket không hợp lệ:", message);
      }
    } catch (error) {
      console.error("Lỗi xử lý tin nhắn WebSocket:", error);
      console.error("Dữ liệu gốc:", event.data);
    }
  };

  // --- Start Execution ---
  // Initialize all components when the DOM is ready
  try {
    let tsChartsOk = initTimeSeriesCharts();
    let bubbleChartsOk = initBubbleCharts();
    let plotlyOk = initPlotly3D(); // Initialize Plotly
    let mapOk = initMap();

    // Log success or failure of initialization
    if (tsChartsOk && bubbleChartsOk && plotlyOk && mapOk) {
      // Check all components
      console.log("Các thành phần dashboard đã khởi tạo thành công.");
    } else {
      console.error(
        "Khởi tạo thành phần dashboard thất bại. Dashboard có thể không hoạt động đúng."
      );
      // Display error message if core components fail
      document.body.insertAdjacentHTML(
        "afterbegin",
        `<p style='background:red; color:white; padding:10px; text-align:center; font-weight:bold;'>Lỗi: Không thể khởi tạo một số thành phần chính của Dashboard.</p>`
      );
    }
  } catch (error) {
    // Catch critical errors during setup
    console.error("CRITICAL Error during initial setup:", error);
    // Display a critical error message to the user
    document.body.innerHTML = `<p style='color:red; text-align:center; padding: 20px;'>Đã xảy ra lỗi nghiêm trọng khi tải Dashboard. Vui lòng kiểm tra Console (F12).</p>`;
  }
}); // End DOMContentLoaded
