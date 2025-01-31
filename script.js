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
        name: info[1] || "Sem Nome",
        logo: attrs.find(attr => attr.includes("tvg-logo="))
          ? attrs.find(attr => attr.includes("tvg-logo=")).split("=")[1].replace(/"/g, "")
          : "",
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
    li.setAttribute("data-index", index);
    
    const deleteButton = document.createElement("button");
    deleteButton.textContent = "X";
    deleteButton.onclick = (event) => {
      event.stopPropagation();
      deletePlaylist(index);
    };

    li.appendChild(deleteButton);
    li.onclick = () => loadChannels(index);
    playlistList.appendChild(li);
  });
}

function deletePlaylist(index) {
  playlists.splice(index, 1);
  updatePlaylistList();
  document.getElementById("channelList").innerHTML = "";
}

async function checkChannelOnline(url) {
  try {
    const response = await fetch(url, { method: "HEAD" });
    return response.ok;
  } catch (error) {
    return false;
  }
}

async function updateChannelListStatus(channelList) {
  const channels = channelList.getElementsByTagName("li");
  const channelUrls = Array.from(channels).map(channel => channel.getAttribute("data-url"));

  Array.from(channels).forEach((channel) => {
    channel.textContent = channel.textContent.replace(/✅|❌/g, "") + " ⌛";
  });

  const onlineStatuses = await Promise.all(channelUrls.map(url => checkChannelOnline(url)));

  Array.from(channels).forEach((channel, index) => {
    const statusEmoji = onlineStatuses[index] ? "✅" : "❌";
    channel.textContent = channel.textContent.replace(/⌛/g, "") + ` ${statusEmoji}`;
  });
}

function loadChannels(playlistIndex) {
  const channelList = document.getElementById("channelList");
  channelList.innerHTML = "";

  playlists[playlistIndex].forEach((channel) => {
    const li = document.createElement("li");
    li.setAttribute("data-url", channel.url);
    
    if (channel.logo) {
      const logo = document.createElement("img");
      logo.src = channel.logo;
      logo.style.width = "20px";
      logo.style.height = "20px";
      logo.style.marginRight = "10px";
      li.appendChild(logo);
    }

    const channelName = document.createElement("span");
    channelName.textContent = channel.name;
    li.appendChild(channelName);

    li.onclick = () => playChannel(channel);
    channelList.appendChild(li);
  });

  updateChannelListStatus(channelList);
}

function playChannel(channel) {
  const video = document.getElementById("video");

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

  document.querySelectorAll(".sidebar").forEach(menu => {
    menu.classList.remove("active");
  });
}

function filterChannels() {
  const searchTerm = document.getElementById("searchChannel").value.toLowerCase();
  const channelList = document.getElementById("channelList");
  const channels = channelList.getElementsByTagName("li");

  for (let i = 0; i < channels.length; i++) {
    const channelName = channels[i].textContent.toLowerCase();
    channels[i].style.display = channelName.includes(searchTerm) ? "flex" : "none";
  }
}

function toggleMenu(menuId) {
  const menus = document.querySelectorAll(".sidebar");
  menus.forEach((menu) => {
    if (menu.id === menuId) {
      menu.classList.toggle("active");
    } else {
      menu.classList.remove("active");
    }
  });
}