// frontend/public/script.js
console.log("Monitor Frontend Script Loaded.");
const mainContent = document.getElementById("main-content");
const loadingIndicator = document.getElementById("loading-indicator");
const usernameDisplay = document.getElementById("username-display");
const logoutButton = document.getElementById("logout-button");
const telemetryTableBody = document.getElementById("telemetry-table-body");
const topicStatusDiv = document.getElementById("topic-status");
const messageSizeChartCtx = document
  .getElementById("messageSizeChart")
  ?.getContext("2d");
let messageSizeChart = null;
const API_BASE_URL = "/api";
async function checkAuthAndInitialize() {
  console.log("Checking auth status...");
  try {
    const response = await fetch(`${API_BASE_URL}/auth/status`);
    if (!response.ok) {
      console.error("Auth status check failed:", response.status);
      redirectToLogin();
      return;
    }
    const data = await response.json();
    if (data.isAuthenticated) {
      console.log("User is authenticated:", data.user.username);
      showDashboard(data.user);
      initializeDashboard();
    } else {
      console.log("User is not authenticated.");
      redirectToLogin();
    }
  } catch (error) {
    console.error("Error checking authentication status:", error);
    loadingIndicator.textContent =
      "Error loading page. Please try again later.";
  }
}
function showDashboard(user) {
  loadingIndicator.classList.add("d-none");
  mainContent.classList.remove("d-none");
  logoutButton.classList.remove("d-none");
  if (user && user.username) {
    usernameDisplay.textContent = `Logged in as: ${user.username}`;
    usernameDisplay.classList.remove("d-none");
  }
  logoutButton.addEventListener("click", handleLogout);
}
function redirectToLogin() {
  window.location.href = "/login.html";
}
async function handleLogout() {
  console.log("Attempting logout...");
  try {
    const response = await fetch(`${API_BASE_URL}/auth/logout`, {
      method: "POST",
    });
    if (response.ok) {
      console.log("Logout successful.");
      redirectToLogin();
    } else {
      const data = await response.json();
      console.error("Logout failed:", data.error);
      alert("Logout failed. Please try again.");
    }
  } catch (error) {
    console.error("Error during logout:", error);
    alert("An error occurred during logout.");
  }
}
function initializeDashboard() {
  console.log("Initializing dashboard...");
  if (!messageSizeChartCtx) {
    console.error("Chart canvas context not found!");
    return;
  }
  initializeChart();
  fetchTopicStatus();
  fetchLatestTelemetry();
  fetchMessageSizeStats();
  setInterval(fetchTopicStatus, 5000);
  setInterval(fetchLatestTelemetry, 3000);
  setInterval(fetchMessageSizeStats, 10000);
}
function initializeChart(labels = [], data = []) {
  if (!messageSizeChartCtx) return;
  if (messageSizeChart) {
    messageSizeChart.destroy();
  }
  messageSizeChart = new Chart(messageSizeChartCtx, {
    type: "bar",
    data: {
      labels: labels,
      datasets: [
        {
          label: "Average Message Size (bytes)",
          data: [],
          backgroundColor: "rgba(54, 162, 235, 0.6)",
          borderColor: "rgba(54, 162, 235, 1)",
          borderWidth: 1,
          statsData: [],
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: {
          beginAtZero: true,
          title: { display: true, text: "Size (Bytes)" },
        },
        x: { title: { display: true, text: "Topic" } },
      },
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: function (context) {
              let label = context.dataset.label || "";
              if (label) {
                label += ": ";
              }
              if (context.parsed.y !== null) {
                label += `${context.parsed.y.toFixed(1)} bytes (avg)`;
              }
              return label;
            },
            footer: function (tooltipItems) {
              const index = tooltipItems[0]?.dataIndex;
              const stats = messageSizeChart.data.datasets[0].statsData;
              if (stats && index !== undefined && stats[index]) {
                const stat = stats[index];
                return [
                  `Min: ${stat.minSize} B`,
                  `Max: ${stat.maxSize} B`,
                  `Count: ${stat.count}`,
                ];
              }
              return null;
            },
          },
        },
      },
    },
  });
}
async function fetchData(url, errorMsgElementId, errorText) {
  try {
    const response = await fetch(url);
    if (response.status === 401) {
      console.warn("API request unauthorized. Redirecting to login.");
      redirectToLogin();
      return null;
    }
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status} for ${url}`);
    }
    return await response.json();
  } catch (error) {
    console.error(`Error fetching ${url}:`, error);
    const errorElement = document.getElementById(errorMsgElementId);
    if (errorElement) {
      if (errorMsgElementId === "telemetry-table-body") {
        errorElement.innerHTML = errorText;
      } else {
        errorElement.textContent = errorText;
      }
    }
    return null;
  }
}
async function fetchTopicStatus() {
  const stats = await fetchData(
    `${API_BASE_URL}/status/topics`,
    "topic-status",
    "Error loading topic status."
  );
  if (stats) displayTopicStatus(stats);
}
async function fetchLatestTelemetry() {
  const data = await fetchData(
    `${API_BASE_URL}/telemetry/latest?limit=50`,
    "telemetry-table-body",
    '<tr><td colspan="5" class="text-danger">Error loading telemetry data.</td></tr>'
  );
  if (data) displayTelemetryData(data);
}
async function fetchMessageSizeStats() {
  const stats = await fetchData(
    `${API_BASE_URL}/stats/message-size?interval=60`,
    null,
    null
  );
  if (stats) updateMessageSizeChart(stats);
}
function displayTopicStatus(stats) {
  if (!topicStatusDiv) return;
  topicStatusDiv.innerHTML = "";
  if (!stats || Object.keys(stats).length === 0) {
    topicStatusDiv.innerHTML = "<p>No topic status available yet.</p>";
    return;
  }
  let cardsHtml = "";
  const cardBg = "bg-light";
  for (const topic in stats) {
    const stat = stats[topic];
    const lastMsgTime = stat.lastMessageTimestamp
      ? new Date(stat.lastMessageTimestamp).toLocaleString()
      : "N/A";
    cardsHtml += ` <div class="col-md-6 col-lg-4 mb-3"><div class="card h-100 ${cardBg}"><div class="card-body"><h6 class="card-title topic-name fw-bold" title="${topic}">${topic}</h6><ul class="list-unstyled mb-0 small"><li>Count: <span class="fw-medium">${stat.messageCount}</span></li><li>Last Size: <span class="fw-medium">${stat.lastMessageSize} B</span></li><li class="text-muted">Last Msg: ${lastMsgTime}</li></ul></div></div></div> `;
  }
  topicStatusDiv.innerHTML = cardsHtml;
}
function displayTelemetryData(data) {
  if (!telemetryTableBody) return;
  telemetryTableBody.innerHTML = "";
  if (!data || data.length === 0) {
    telemetryTableBody.innerHTML =
      '<tr><td colspan="5">No telemetry data available.</td></tr>';
    return;
  }
  let rowsHtml = "";
  data.forEach((item) => {
    const dataString = JSON.stringify(item.data);
    const displayData =
      dataString.length > 60 ? dataString.substring(0, 60) + "..." : dataString;
    const errorClass = item.data && item.data.er ? "table-danger" : "";
    rowsHtml += ` <tr class="${errorClass}"><td>${new Date(
      item.receivedAt
    ).toLocaleTimeString()}</td><td>${
      item.deviceID
    }</td><td class="topic-name" title="${item.topic}">${
      item.topic
    }</td><td title='${dataString}'>${displayData}</td><td>${
      item.messageSize
    }</td></tr> `;
  });
  telemetryTableBody.innerHTML = rowsHtml;
}
function updateMessageSizeChart(stats) {
  if (!messageSizeChart || !stats) return;
  if (stats.length === 0) {
    messageSizeChart.data.labels = [];
    messageSizeChart.data.datasets[0].data = [];
    messageSizeChart.data.datasets[0].statsData = [];
    messageSizeChart.update();
    return;
  }
  const labels = stats.map((s) => s._id);
  const dataValues = stats.map((s) => parseFloat(s.avgSize || 0).toFixed(1));
  messageSizeChart.data.labels = labels;
  messageSizeChart.data.datasets[0].data = dataValues;
  messageSizeChart.data.datasets[0].statsData = stats;
  messageSizeChart.update();
}
document.addEventListener("DOMContentLoaded", checkAuthAndInitialize);
