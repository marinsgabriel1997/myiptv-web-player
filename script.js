let playlists = [];

function addPlaylist(file) {
	if (!file) {
		alert("Por favor, selecione um arquivo.");
		return;
	}

	const reader = new FileReader();
	reader.onload = function (e) {
		const data = e.target.result;
		const playlist = parseM3U(data);
		playlist.name = file.name.replace(".m3u", "");
		playlists.push(playlist);
		updatePlaylistList();
	};
	reader.onerror = function () {
		alert("Erro ao ler o arquivo. Por favor, tente novamente.");
	};
	reader.readAsText(file);
}

function fetchPlaylist(url) {
	console.log("URL:", url);
	fetch(url)
		.then((response) => {
			if (!response.ok) {
				throw new Error(`Erro na requisição: ${response.status} ${response.statusText}`);
			}
			return response.text();
		})
		.then((data) => {
			const playlist = parseM3U(data);
			playlist.name = url.split("/").pop().replace(".m3u", "");
			playlists.push(playlist);
			updatePlaylistList();
		})
		.catch((error) => {
			setTimeout(() => {
				//notificação não intrusiva sobre url incorreta
			}, 1000);
		});
}

function readFile(file) {
	const reader = new FileReader();
	reader.onload = function (event) {
		const data = event.target.result;
		const playlist = parseM3U(data);
		playlists.push(playlist);
		updatePlaylistList();
	};
	reader.onerror = function () {
		alert("Erro ao ler o arquivo. Por favor, tente novamente.");
	};
	reader.readAsText(file);
}

function parseM3U(data) {
	const lines = data.split("\n").filter((line) => line.trim() !== "");
	const playlist = [];
	let channel = {};

	lines.forEach((line) => {
		if (line.startsWith("#EXTINF:")) {
			const info = line.split(",");
			const attrs = info[0].split(" ");
			channel = {
				name: info[1] || "Sem Nome",
				logo: attrs.find((attr) => attr.includes("tvg-logo="))
					? attrs
							.find((attr) => attr.includes("tvg-logo="))
							.split("=")[1]
							.replace(/"/g, "")
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
	if (playlists.length === 0) {
		playlistList.innerHTML = "<li>Nenhuma playlist disponível</li>";
		return;
	}
	playlists.forEach((playlist, index) => {
		const li = document.createElement("li");

		const deleteButton = document.createElement("button");
		deleteButton.textContent = "🗑️";
		deleteButton.onclick = (event) => {
			event.stopPropagation();
			deletePlaylist(index);
		};

		const span = document.createElement("span");
		span.textContent = playlist.name || `Playlist ${index + 1}`;

		li.appendChild(deleteButton);
		li.appendChild(span);
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
		console.error("Erro ao verificar o status do canal:", error);
		return false;
	}
}

async function updateChannelListStatus(channelList) {
	const channels = channelList.getElementsByTagName("li");
	const channelUrls = Array.from(channels).map((channel) => channel.getAttribute("data-url"));

	Array.from(channels).forEach((channel) => {
		const channelName = channel.getAttribute("data-name"); // Preserva o nome original
		channel.textContent = channelName + " ⌛"; // Adiciona o indicador de carregamento
	});

	const onlineStatuses = await Promise.all(channelUrls.map((url) => checkChannelOnline(url))).catch((error) => {
		console.error("Erro ao atualizar o status dos canais:", error);
		return Array(channelUrls.length).fill(false);
	});

	Array.from(channels).forEach((channel, index) => {
		const channelName = channel.getAttribute("data-name"); // Preserva o nome original
		const statusEmoji = onlineStatuses[index] ? "✅" : "❌";
		channel.textContent = channelName + ` ${statusEmoji}`; // Adiciona o status ao nome original
	});
}

function loadChannels(playlistIndex) {
	const channelList = document.getElementById("channelList");
	channelList.innerHTML = "";

	if (!playlists[playlistIndex]) {
		alert("Playlist não encontrada.");
		return;
	}
	playlists[playlistIndex].forEach((channel) => {
		const li = document.createElement("li");
		li.setAttribute("data-url", channel.url);
		li.setAttribute("data-name", channel.name); // Armazena o nome original do canal

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

	if (confirm("Deseja verificar o status da lista de canais?")) {
		updateChannelListStatus(channelList);
	}

	toggleMenu("sidebar-right");
}

function playChannel(channel) {
	const video = document.getElementById("video");

	if (Hls.isSupported()) {
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
			return;
		}
	} else if (video.canPlayType("application/vnd.apple.mpegurl")) {
		video.src = channel.url;
		video.play();
	} else {
		alert("Seu navegador não suporta HLS.");
	}

	document.querySelectorAll(".sidebar").forEach((menu) => {
		menu.classList.remove("active");
	});
}

function filterChannels() {
	const searchTerm = document.getElementById("searchChannel").value.toLowerCase();
	const channelList = document.getElementById("channelList");
	const channels = channelList.getElementsByTagName("li");

	for (let i = 0; i < channels.length; i++) {
		const channelName = channels[i].getAttribute("data-name").toLowerCase(); // Usa o nome original do canal
		channels[i].style.display = channelName.includes(searchTerm) ? "flex" : "none";
	}
}

function toggleMenu(menuId) {
	const menus = document.querySelectorAll(".sidebar");
	menus.forEach((menu) => {
		if (!menu) return;
		if (menu.id === menuId) {
			menu.classList.toggle("active");
		} else {
			menu.classList.remove("active");
		}
	});
}

function changeType() {
	const urlRaw = document.getElementById("urlRaw");
	const urlInput = document.getElementById("url");
	const arquivoInput = document.getElementById("arquivo");

	if (urlRaw.checked) {
		urlInput.style.display = "block";
		arquivoInput.style.display = "none";
	} else {
		urlInput.style.display = "none";
		arquivoInput.style.display = "block";
	}
}

document.addEventListener("DOMContentLoaded", function () {
	document.getElementById("m3uFile").addEventListener("change", function (event) {
		let file = event.target.files[0];
		if (file) {
			addPlaylist(file);
		}
	});

	document.getElementById("m3uUrl").addEventListener("input", function (event) {
		let text = document.getElementById("m3uUrl").value;
		if (text) {
			fetchPlaylist(text);
		}
	});

	document.querySelector("#urlRaw").addEventListener("change", changeType);
	document.querySelector("#arquivoM3u").addEventListener("change", changeType);

	document.querySelector("#btn_sidebar-left").addEventListener("click", () => toggleMenu("sidebar-left"));
	document.querySelector("#btn_sidebar-right").addEventListener("click", () => toggleMenu("sidebar-right"));
	document.querySelector("#searchChannel").addEventListener("input", filterChannels);
});
