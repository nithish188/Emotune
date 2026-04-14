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
                        
                        // Navigate to standard YouTube link automatically via Window Open
                        let songUrl = YOUTUBE_URL_MAP[currentStableEmotion];
                        let newWin = window.open(songUrl, '_blank');
                        
                        // Check if popup was blocked by browser
                        if (!newWin || newWin.closed || typeof newWin.closed == 'undefined') {
                            // Popup blocked! Fallback to a giant override button
                            playerContainer.innerHTML = `
                                <div style="position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.9); z-index:9999; display:flex; justify-content:center; align-items:center; flex-direction:column;">
                                    <h2 style="color:white; margin-bottom: 20px;">Popup Blocked by Browser!</h2>
                                    <a href="${songUrl}" target="_blank" style="padding: 20px 40px; background: #E74C3C; color: white; text-decoration: none; font-size: 24px; font-weight: bold; border-radius: 10px;">
                                        ▶ Click Here to Force Play Song
                                    </a>
                                </div>
                            `;
                        } else {
                            musicProgress.innerText = `Redirecting to song...`;
                        }
                    }
                } else if (currentlyPlayingEmotion !== currentStableEmotion) {
                    const remaining = Math.ceil((5000 - elapsed) / 1000);
                    musicProgress.innerText = `Hold ${EMOJI_MAP[maxE]} ${maxE} for ${remaining}s...`;
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
    happy: "https://youtube.com/playlist?list=PL3oW2tjiIxvTaC6caIGR55W3ssqGvb_LR&si=jtF_6xspQLWEjGBW",
    sad: "https://www.youtube.com/watch?v=PVZSYMFfwiM",
    angry: "https://www.youtube.com/results?search_query=Aaluma+Doluma+video+song",
    surprised: "https://www.youtube.com/results?search_query=Vaathi+Coming+video+song",
    neutral: "https://www.youtube.com/results?search_query=New+York+Nagaram+video+song",
    fearful: "https://www.youtube.com/results?search_query=Kanchana+horror+BGM",
    disgusted: "https://www.youtube.com/watch?v=YR12Z8f1Dh8" // Why this Kolaveri Di
};

const musicProgress = document.getElementById('music-progress');
const playerContainer = document.getElementById('player-container');

// Entry Point
loadModels();
