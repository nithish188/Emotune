const video = document.getElementById('videoElement');

const EMOJI_MAP = {
    happy: "😄",
    sad: "😢",
    angry: "😠",
    surprised: "😲",
    neutral: "😐",
    fearful: "😨",
    disgusted: "🤢"
};

const MODEL_URL = './models';

// Load models
async function loadModels() {
    try {
        await Promise.all([
            faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
            faceapi.nets.faceExpressionNet.loadFromUri(MODEL_URL)
        ]);
        startVideo();
    } catch (err) {
        console.error("Error loading models:", err);
    }
}

// Start Video
function startVideo() {
    navigator.mediaDevices.getUserMedia({ video: true, audio: false })
        .then(stream => {
            video.srcObject = stream;
        })
        .catch(err => {
            console.error("Error accessing webcam:", err);
        });
}

let isPlayingInitialized = false;

// Map canvas drawing to video bounding client rect size
video.addEventListener('playing', () => {
    if (isPlayingInitialized) return;
    isPlayingInitialized = true;

    const wrapper = document.querySelector('.video-wrapper');
    const canvas = faceapi.createCanvasFromMedia(video);
    wrapper.append(canvas);
    
    const displaySize = { width: video.videoWidth, height: video.videoHeight };
    faceapi.matchDimensions(canvas, displaySize);

    let smoothedExpressions = {
        happy: 0, sad: 0, angry: 0, surprised: 0, neutral: 0, fearful: 0, disgusted: 0
    };

    let autoPlayerEnabled = true;
    let currentStableEmotion = null;
    let emotionStartTime = Date.now();
    let currentlyPlayingEmotion = null;
    let detectionStopped = false; // Add variable to stop detection once triggered

    // Init UI for default ON
    musicProgress.style.display = "block";
    musicProgress.innerText = "Hold an emotion for 5 seconds...";

    setInterval(async () => {
        if (detectionStopped) return;
        const detections = await faceapi.detectAllFaces(video, new faceapi.TinyFaceDetectorOptions()).withFaceExpressions();
        
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        if (detections && detections.length > 0) {
            const resizedDetections = faceapi.resizeResults(detections, displaySize);
            
            ctx.strokeStyle = "#5E6AD2"; 
            ctx.lineWidth = 3;
            ctx.lineJoin = "round";
            
            resizedDetections.forEach(det => {
                const box = det.detection.box;
                ctx.strokeRect(box.x, box.y, box.width, box.height);
            });
            
            const rawExpressions = detections[0].expressions;
            for (const emotion in rawExpressions) {
                smoothedExpressions[emotion] = (smoothedExpressions[emotion] * 0.85) + (rawExpressions[emotion] * 0.15);
            }
            updateDashboard(smoothedExpressions);

            let maxE = "";
            let maxV = 0;
            for (const [em, val] of Object.entries(smoothedExpressions)) {
                if (val > maxV) { maxV = val; maxE = em; }
            }

            if (maxE !== currentStableEmotion) {
                currentStableEmotion = maxE;
                emotionStartTime = Date.now();
                if (autoPlayerEnabled) {
                    musicProgress.innerText = `Detecting ${EMOJI_MAP[maxE]} ${maxE}... hold it!`;
                }
            } else if (autoPlayerEnabled) {
                const elapsed = Date.now() - emotionStartTime;
                if (elapsed >= 5000) {
                    if (currentlyPlayingEmotion !== currentStableEmotion && YOUTUBE_URL_MAP[currentStableEmotion]) {
                        currentlyPlayingEmotion = currentStableEmotion;
                        musicProgress.innerText = `Stable! ${EMOJI_MAP[currentStableEmotion]} ${currentStableEmotion}. Playing now...`;
                        
                        // Stop detection
                        detectionStopped = true;
                        
                        // Navigate the iframe to a YouTube Embed player to automatically bypass cross-origin browser blockers
                        window.location.href = YOUTUBE_URL_MAP[currentStableEmotion];
                    }
                } else if (currentlyPlayingEmotion !== currentStableEmotion) {
                    const remaining = Math.ceil((5000 - elapsed) / 1000);
                    musicProgress.innerText = `Hold ${EMOJI_MAP[maxE]} ${maxE} for ${remaining}s...`;
                    ytLink.style.display = "none";
                }
            }
        } else {
            resetBars();
            
            for (const emotion in smoothedExpressions) {
                smoothedExpressions[emotion] *= 0.5;
            }
        }
    }, 150);
});

function updateDashboard(expressions) {
    let maxEmotion = "";
    let maxValue = 0;

    for (const [emotion, value] of Object.entries(expressions)) {
        if (value > maxValue) {
            maxValue = value;
            maxEmotion = emotion;
        }

        const percentage = Math.round(value * 100);
        const bar = document.getElementById(`bar-${emotion}`);
        const valText = document.getElementById(`val-${emotion}`);
        
        if (bar && valText) {
            bar.style.width = `${percentage}%`;
            valText.innerText = `${percentage}%`;
            bar.style.opacity = percentage > 50 ? '1' : '0.5';
        }
    }
}

function resetBars() {
    const emotions = ['happy', 'sad', 'angry', 'surprised', 'neutral', 'fearful', 'disgusted'];
    emotions.forEach(emotion => {
        const bar = document.getElementById(`bar-${emotion}`);
        const valText = document.getElementById(`val-${emotion}`);
        if(bar) {
            bar.style.width = "0%";
            bar.style.opacity = "0.5";
        }
        if(valText) valText.innerText = "0%";
    });
}

const YOUTUBE_URL_MAP = {
    happy: "https://www.youtube.com/embed/videoseries?list=PL3oW2tjiIxvTaC6caIGR55W3ssqGvb_LR&autoplay=1",
    sad: "https://www.youtube.com/embed/PVZSYMFfwiM?autoplay=1",
    angry: "https://www.youtube.com/embed/a18py61_F_w?autoplay=1", // Aaluma Doluma
    surprised: "https://www.youtube.com/embed/fGsyBcbDSNw?autoplay=1", // Vaathi Coming
    neutral: "https://www.youtube.com/embed/tT_B-N94t8I?autoplay=1", // New York Nagaram
    fearful: "https://www.youtube.com/embed/x2B5Z9r9iYQ?autoplay=1", // Kanchana
    disgusted: "https://www.youtube.com/embed/YR12Z8f1Dh8?autoplay=1" // Kolaveri Di
};

const musicProgress = document.getElementById('music-progress');
const playerContainer = document.getElementById('player-container');
const ytLink = document.getElementById('youtube-link');

// Cleaned up old event listener

// Entry Point
loadModels();
