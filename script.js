let playlists = [];

function addPlaylist() {
  const url = document.getElementById("m3uUrl").value;
  const fileInput = document.getElementById("m3uFile");
  const file = fileInput.files[0];

  if (url) {
    fetchPlaylist(url);
  } else if (file) {
    readFile(file);
  } else {
    alert("Por favor, insira uma URL ou selecione um arquivo.");
  }
}

function fetchPlaylist(url) {
  fetch(url)
    .then((response) => response.text())
    .then((data) => {
      const playlist = parseM3U(data);
      playlists.push(playlist);
      updatePlaylistList();
    })
    .catch((error) => console.error("Erro ao carregar a lista:", error));
}

function readFile(file) {
  const reader = new FileReader();
  reader.onload = function (event) {
    const data = event.target.result;
    const playlist = parseM3U(data);
    playlists.push(playlist);
    updatePlaylistList();
  };
  reader.readAsText(file);
}

function parseM3U(data) {
  const lines = data.split("\n");
  const playlist = [];
  let channel = {};

  lines.forEach((line) => {
    if (line.startsWith("#EXTINF:")) {
      const info = line.split(",");
      const attrs = info[0].split(" ");
      channel = {
        name: info[1],
        logo: attrs
          .find((attr) => attr.startsWith("tvg-logo="))
          ?.split("=")[1]
          ?.replace(/"/g, ""),
        url: "",
      };
    } else if (line.startsWith("http")) {
      channel.url = line.trim();
      playlist.push(channel);
    }
  });

  return playlist;
}

function updatePlaylistList() {
  const playlistList = document.getElementById("playlistList");
  playlistList.innerHTML = "";
  playlists.forEach((playlist, index) => {
    const li = document.createElement("li");
    li.textContent = `Lista ${index + 1}`;

    // Add a delete button
    const deleteButton = document.createElement("button");
    deleteButton.textContent = "X";
    deleteButton.onclick = (event) => {
      event.stopPropagation(); // Prevent triggering the li's click event
      deletePlaylist(index);
    };

    li.appendChild(deleteButton);
    li.onclick = () => loadChannels(index);
    playlistList.appendChild(li);
  });
}

function deletePlaylist(index) {
  playlists.splice(index, 1); // Remove the playlist from the array
  updatePlaylistList(); // Update the UI
  document.getElementById("channelList").innerHTML = ""; // Clear the channel list
}

// Function to check if a channel is online
async function checkChannelOnline(url) {
  try {
    const response = await fetch(url, { method: "HEAD" });
    return response.ok; // Returns true if the status code is 200-299
  } catch (error) {
    return false; // If there's an error (e.g., network issue), the channel is offline
  }
}

// Function to update the channel list with online/offline status
async function updateChannelListStatus(channelList) {
  const channels = channelList.getElementsByTagName("li");
  const channelUrls = Array.from(channels).map((channel) =>
    channel.getAttribute("data-url")
  );

  // Show a loading indicator
  Array.from(channels).forEach((channel) => {
    channel.textContent = channel.textContent.replace(/✅|❌/g, ""); // Remove existing emoji
    channel.textContent += " ⌛"; // Add loading emoji
  });

  // Check all channels in parallel
  const onlineStatuses = await Promise.all(
    channelUrls.map((url) => checkChannelOnline(url))
  );

  // Update the channel list with online/offline status
  Array.from(channels).forEach((channel, index) => {
    const statusEmoji = onlineStatuses[index] ? "✅" : "❌";
    channel.textContent = channel.textContent.replace(/⌛/g, ""); // Remove loading emoji
    channel.textContent += ` ${statusEmoji}`;
  });
}

// Modify the loadChannels function to include the URL as a data attribute
function loadChannels(playlistIndex) {
  const channelList = document.getElementById("channelList");
  channelList.innerHTML = "";
  playlists[playlistIndex].forEach((channel, index) => {
    const li = document.createElement("li");
    li.setAttribute("data-url", channel.url); // Store the URL in a data attribute

    // Add channel logo if available
    if (channel.logo) {
      const logo = document.createElement("img");
      logo.src = channel.logo;
      logo.style.width = "20px";
      logo.style.height = "20px";
      logo.style.marginRight = "10px";
      li.appendChild(logo);
    }

    // Add channel name
    const channelName = document.createElement("span");
    channelName.textContent = channel.name;
    li.appendChild(channelName);

    li.onclick = () => playChannel(channel);
    channelList.appendChild(li);
  });

  // Update the channel list with online/offline status
  updateChannelListStatus(channelList);
}

function playChannel(channel) {
  const video = document.getElementById("video");
  const channelName = document.getElementById("channelName");
  const channelLogo = document.getElementById("channelLogo");

  channelName.textContent = channel.name;
  channelLogo.src = channel.logo || "";

  if (Hls.isSupported()) {
    const hls = new Hls();
    hls.loadSource(channel.url);
    hls.attachMedia(video);
    hls.on(Hls.Events.MANIFEST_PARSED, () => {
      video.play();
    });
  } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
    video.src = channel.url;
    video.play();
  } else {
    alert("Seu navegador não suporta HLS.");
  }
}

function filterChannels() {
  const searchTerm = document
    .getElementById("searchChannel")
    .value.toLowerCase();
  const channelList = document.getElementById("channelList");
  const channels = channelList.getElementsByTagName("li");

  for (let i = 0; i < channels.length; i++) {
    const channelName = channels[i].textContent.toLowerCase();
    if (channelName.includes(searchTerm)) {
      channels[i].style.display = "flex"; // Show the channel
    } else {
      channels[i].style.display = "none"; // Hide the channel
    }
  }
}
