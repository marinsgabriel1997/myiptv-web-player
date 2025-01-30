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
    li.onclick = () => loadChannels(index);
    playlistList.appendChild(li);
  });
}

function loadChannels(playlistIndex) {
  const channelList = document.getElementById("channelList");
  channelList.innerHTML = "";
  playlists[playlistIndex].forEach((channel, index) => {
    const li = document.createElement("li");
    li.textContent = channel.name;
    li.onclick = () => playChannel(channel);
    channelList.appendChild(li);
  });
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
