const showViewAboutSystem = async () => {
  const system = { system: "hubservice-jardim" };

  const PLAYER_MAX_WIDTH = "500px";
  const PLAYER_HEIGHT_PX = 200;
  const PLAYER_BORDER_RADIUS = "12px";

  let videos = [];
  try {
    videos = (await fetchData("/media", "PUT", system)) || [];
  } catch (err) {
    console.error("Erro ao buscar vídeos:", err);
    videos = [];
  }

  let html = `
    <h2 class="text-center mb-3 text-primary fw-bold">
      <i class="bi bi-camera-video me-2"></i> Sobre o Sistema
    </h2>
    <div id="about-system-videos-list" class="row g-4 justify-content-center">
  `;

  videos.forEach((video, idx) => {
    const rawUrl = String(video.url || "").trim();
    const url = sanitizeUrl(rawUrl);
    const isYouTube = /youtube\.com|youtu\.be/.test(url);
    const isDailymotion = /dailymotion\.com|dai\.ly/.test(url);
    const youtubeId = isYouTube ? extractYouTubeID(url) : null;
    const dailymotionId = isDailymotion ? extractDailymotionID(url) : null;
    const poster = getPoster({ youtubeId, dailymotionId, video });

    html += `
      <div class="col-12 col-md-6 col-lg-4 mb-2 d-flex justify-content-center">
        <div class="card rounded-4 overflow-hidden flex-fill" style="max-width: ${PLAYER_MAX_WIDTH}; border-radius: ${PLAYER_BORDER_RADIUS};">
          <div class="video-placeholder d-flex align-items-center justify-content-center" 
               data-index="${idx}"
               data-url="${escapeAttr(url)}"
               data-type="${
                 isYouTube ? "youtube" : isDailymotion ? "dailymotion" : "mp4"
               }"
               data-youtube-id="${escapeAttr(youtubeId || "")}"
               data-dailymotion-id="${escapeAttr(dailymotionId || "")}"
               style="
                 background-image: url('${escapeAttr(poster)}');
                 background-size: cover;
                 background-position: center;
                 width: 100%;
                 height: ${PLAYER_HEIGHT_PX}px;
                 display: flex;
                 align-items: center;
                 justify-content: center;
                 border-top-left-radius: ${PLAYER_BORDER_RADIUS};
                 border-top-right-radius: ${PLAYER_BORDER_RADIUS};
                 overflow: hidden;
               ">
            <button class="btn btn-light rounded-circle shadow-sm js-play-video" aria-label="Play video" style="width:56px; height:56px;">
              <i class="bi bi-play-fill fs-4"></i>
            </button>
          </div>

          <div class="card-body d-flex flex-column">
            <h5 class="card-title fw-semibold">
              <i class="bi ${escapeAttr(
                video.icon || "bi-play-circle"
              )} me-2 text-primary"></i>${escapeHtml(video.title || "")}
            </h5>
            <p class="card-text text-muted flex-grow-1" style="font-size:0.9rem;">${escapeHtml(
              video.description || ""
            )}</p>
            <a href="${escapeAttr(
              rawUrl
            )}" target="_blank" class="btn btn-sm btn-primary mt-2 shadow-sm">
              <i class="bi bi-fullscreen me-1"></i> Assistir Fullscreen
            </a>
          </div>
        </div>
      </div>
    `;
  });

  html += `</div>`;

  const container = document.getElementById("about-system-videos");
  if (container) container.innerHTML = html;

  (function protectPlaysScoped() {
    try {
      const originalPlay = HTMLMediaElement.prototype.play;
      HTMLMediaElement.prototype.play = function () {
        if (this.closest && this.closest("#about-system-videos")) {
          if (this.dataset.allowPlay === "true") {
            return originalPlay.apply(this, arguments);
          }
          return Promise.reject(
            new Error(
              "Autoplay prevented for media inside #about-system-videos"
            )
          );
        }
        return originalPlay.apply(this, arguments);
      };
    } catch (e) {
      console.warn("Proteção autoplay não aplicada:", e);
    }
  })();

  const list = document.getElementById("about-system-videos-list");
  if (list) {
    list.addEventListener("click", function (ev) {
      const playBtn = ev.target.closest?.(".js-play-video");
      if (!playBtn) return;
      const placeholder = playBtn.closest(".video-placeholder");
      if (!placeholder) return;

      const type = placeholder.dataset.type;
      const url = placeholder.dataset.url;
      const ytId = placeholder.dataset.youtubeId;
      const dmId = placeholder.dataset.dailymotionId;

      if (type === "youtube" && ytId) {
        const iframe = document.createElement("iframe");
        iframe.src = `https://www.youtube.com/embed/${ytId}?rel=0&modestbranding=1&autoplay=1`;
        iframe.title =
          placeholder.closest(".card")?.querySelector(".card-title")
            ?.textContent || "YouTube video";
        iframe.frameBorder = "0";
        iframe.allow =
          "accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture; autoplay";
        iframe.allowFullscreen = true;
        iframe.loading = "lazy";
        styleNodeForPlayer(iframe);
        replacePlaceholderWithNode(placeholder, iframe);
      } else if (type === "dailymotion" && dmId) {
        const iframe = document.createElement("iframe");
        iframe.src = `https://www.dailymotion.com/embed/video/${dmId}?autoplay=1`;
        iframe.title =
          placeholder.closest(".card")?.querySelector(".card-title")
            ?.textContent || "Dailymotion video";
        iframe.frameBorder = "0";
        iframe.allow = "autoplay; fullscreen; picture-in-picture";
        iframe.allowFullscreen = true;
        iframe.loading = "lazy";
        styleNodeForPlayer(iframe);
        replacePlaceholderWithNode(placeholder, iframe);
      } else if (type === "mp4" && url) {
        const videoEl = document.createElement("video");
        videoEl.controls = true;
        videoEl.autoplay = true;
        videoEl.playsInline = true;
        videoEl.setAttribute("playsinline", "");
        videoEl.dataset.allowPlay = "true";
        const src = document.createElement("source");
        src.src = url;
        src.type = "video/mp4";
        videoEl.appendChild(src);
        styleNodeForPlayer(videoEl);
        replacePlaceholderWithNode(placeholder, videoEl);
        videoEl.play().catch(() => {});
      }
    });
  }

  function replacePlaceholderWithNode(placeholder, node) {
    const wrapper = document.createElement("div");
    wrapper.style.width = "100%";
    wrapper.style.height = `${PLAYER_HEIGHT_PX}px`;
    wrapper.style.display = "flex";
    wrapper.style.alignItems = "stretch";
    wrapper.style.justifyContent = "stretch";
    wrapper.style.borderTopLeftRadius = PLAYER_BORDER_RADIUS;
    wrapper.style.borderTopRightRadius = PLAYER_BORDER_RADIUS;
    wrapper.style.overflow = "hidden";
    node.style.width = "100%";
    node.style.height = "100%";
    node.style.objectFit = "cover";
    wrapper.appendChild(node);
    placeholder.replaceWith(wrapper);
  }

  function styleNodeForPlayer(node) {
    node.style.width = "100%";
    node.style.height = "100%";
    node.style.display = "block";
    node.style.margin = "0";
    node.style.padding = "0";
  }

  function getPoster({ youtubeId, dailymotionId, video }) {
    if (youtubeId) {
      return `https://img.youtube.com/vi/${youtubeId}/hqdefault.jpg`;
    }
    if (dailymotionId) {
      return `https://www.dailymotion.com/thumbnail/video/${dailymotionId}`;
    }
    if (video.cover) return video.cover;
    return "https://via.placeholder.com/400x225?text=Video";
  }

  function sanitizeUrl(url) {
    if (!url) return "";
    try {
      const u = new URL(url);
      ["autoplay", "mute", "muted", "start"].forEach((p) =>
        u.searchParams.delete(p)
      );
      if (u.hash) {
        u.hash = u.hash.replace(/(\?|&)?autoplay=\d+/gi, "");
        u.hash = u.hash.replace(/(\?|&)?muted=\d+/gi, "");
      }
      return u.toString();
    } catch (e) {
      return removeAutoplayQuery(url);
    }
  }

  function removeAutoplayQuery(u) {
    if (!u) return "";
    return u
      .replace(/([?&])autoplay=\d+/gi, (m, p1) => (p1 === "?" ? "?" : ""))
      .replace(/([?&])mute=\d+/gi, (m, p1) => (p1 === "?" ? "?" : ""))
      .replace(/([?&])muted=\d+/gi, (m, p1) => (p1 === "?" ? "?" : ""))
      .replace(/\?$/g, "")
      .replace(/&$/g, "");
  }

  function extractYouTubeID(url) {
    if (!url) return null;
    const m = url.match(
      /(?:youtube\.com\/(?:watch\?.*v=|embed\/|v\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/
    );
    return m ? m[1] : null;
  }

  function extractDailymotionID(url) {
    if (!url) return null;
    const m = url.match(/(?:dai\.ly\/|dailymotion\.com\/video\/)([^_/?&]+)/);
    return m ? m[1] : null;
  }

  function escapeHtml(str) {
    return String(str || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  function escapeAttr(str) {
    return String(str || "")
      .replace(/&/g, "&amp;")
      .replace(/"/g, "&quot;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }
};
