type Track = {
  title: string;
  duration: string;
  src: string;
};

const tracks: Track[] = [
  { title: "ink", duration: "8:48", src: "../../press/audio/01-ink.mp3" },
  { title: "kin", duration: "7:12", src: "../../press/audio/02-kin.mp3" },
  { title: "link", duration: "10:08", src: "../../press/audio/03-link.mp3" },
  { title: "ilk", duration: "7:40", src: "../../press/audio/04-ilk.mp3" },
  { title: "kiln", duration: "8:42", src: "../../press/audio/05-kiln.mp3" },
];

const audio = document.querySelector<HTMLAudioElement>("#press-audio");
const playButton = document.querySelector<HTMLButtonElement>("#play-toggle");
const seek = document.querySelector<HTMLInputElement>("#seek");
const elapsed = document.querySelector<HTMLElement>("#elapsed");
const total = document.querySelector<HTMLElement>("#total");
const nowPlaying = document.querySelector<HTMLElement>("#now-playing");
const download = document.querySelector<HTMLAnchorElement>("#current-download");
const trackButtons = Array.from(document.querySelectorAll<HTMLButtonElement>("[data-track]"));

let currentTrack = 0;

function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds)) return "0:00";
  const whole = Math.max(0, Math.floor(seconds));
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, "0")}`;
}

function setTrack(index: number, autoplay = false): void {
  if (!audio || !nowPlaying || !download || !total) return;
  currentTrack = index;
  const track = tracks[index];
  audio.src = track.src;
  audio.load();
  nowPlaying.textContent = track.title;
  total.textContent = track.duration;
  download.href = track.src;
  download.download = `Angle Basin - Eigengrau - ${String(index + 1).padStart(2, "0")} ${track.title}.mp3`;

  trackButtons.forEach((button, buttonIndex) => {
    const selected = buttonIndex === index;
    button.classList.toggle("is-current", selected);
    button.setAttribute("aria-current", selected ? "true" : "false");
  });

  if (autoplay) {
    void audio.play();
  }
}

if (audio && playButton && seek && elapsed && total && nowPlaying && download) {
  trackButtons.forEach((button, index) => {
    button.addEventListener("click", () => setTrack(index, true));
  });

  playButton.addEventListener("click", () => {
    if (audio.paused) void audio.play();
    else audio.pause();
  });

  audio.addEventListener("play", () => {
    playButton.textContent = "pause";
    playButton.setAttribute("aria-label", `Pause ${tracks[currentTrack].title}`);
  });

  audio.addEventListener("pause", () => {
    playButton.textContent = "play";
    playButton.setAttribute("aria-label", `Play ${tracks[currentTrack].title}`);
  });

  audio.addEventListener("timeupdate", () => {
    const duration = Number.isFinite(audio.duration) ? audio.duration : 0;
    seek.value = duration ? String((audio.currentTime / duration) * 1000) : "0";
    elapsed.textContent = formatTime(audio.currentTime);
  });

  audio.addEventListener("loadedmetadata", () => {
    total.textContent = formatTime(audio.duration);
  });

  audio.addEventListener("ended", () => {
    if (currentTrack < tracks.length - 1) setTrack(currentTrack + 1, true);
    else setTrack(0, false);
  });

  seek.addEventListener("input", () => {
    if (Number.isFinite(audio.duration)) {
      audio.currentTime = (Number(seek.value) / 1000) * audio.duration;
    }
  });

  setTrack(0);
}

