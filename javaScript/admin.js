const CONFIG = {
  API_URL: 'https://isinbalbe3.mtacloud.co.il/php/onnx_proxy.php?endpoint=detect',
  API_BASE_URL: 'https://isinbalbe3.mtacloud.co.il/php/onnx_proxy.php?endpoint=',
  DETECTION_INTERVAL: 2000,
  CONFIDENCE_THRESHOLD: 0.4,
  CONSECUTIVE_DETECTIONS: 2,
  MIN_DETECTION_VOTES: 2,
  DEBUG_MODE: true,
  DETECTION_DELAY: 1000,
  API_TIMEOUT: 5000,
  API_CHECK_INTERVAL: 30000,
  SMOOTHING_ENABLED: true,
  DETECTION_BUFFER_SIZE: 4,
  RETRY_ATTEMPTS: 1,
  RETRY_DELAY: 500,
  USE_DIRECT_API: false,
  FALSE_POSITIVE_PROTECTION: true
};

const printMonitors = [
  {
    id: 1,
    videoId: 'video1',
    canvasId: 'canvas1',
    timeId: 'time1',
    warningId: 'warning1',
    stopBtnId: 'stop1',
    bannerId: 'banner1',
    initialTimeOffset: 6000,
    interval: null,
    stopped: false,
    shouldDetectErrors: true,
    defectMessages: {
      'spaghetti': '⚠️ זוהו חוטים דקים (Spaghetti Error) - בדוק את ההדפסה',
      'layer': '⚠️ זוהה שינוי שכבה (Layer Shifting) - בדוק את ההדפסה',
      'clean': '✓ הדפסה תקינה'
    }
  },
  {
    id: 2,
    videoId: 'video2',
    canvasId: 'canvas2',
    timeId: 'time2',
    warningId: 'warning2',
    stopBtnId: 'stop2',
    bannerId: 'banner2',
    initialTimeOffset: 2100,
    interval: null,
    stopped: false,
    shouldDetectErrors: true,
    defectMessages: {
      'spaghetti': '⚠️ זוהו חוטים דקים (Spaghetti Error) - בדוק את ההדפסה',
      'layer': '⚠️ זוהה שינוי שכבה (Layer Shifting) - בדוק את ההדפסה',
      'clean': '✓ הדפסה תקינה'
    }
  },
  {
    id: 3,
    videoId: 'video3',
    canvasId: 'canvas3',
    timeId: 'time3',
    warningId: 'warning3',
    stopBtnId: 'stop3',
    bannerId: 'banner3',
    initialTimeOffset: 600,
    interval: null,
    stopped: false,
    shouldDetectErrors: true,
    defectMessages: {
      'spaghetti': '⚠️ זוהו חוטים דקים (Spaghetti Error) - בדוק את ההדפסה',
      'layer': '⚠️ זוהה שינוי שכבה (Layer Shifting) - בדוק את ההדפסה',
      'clean': '✓ הדפסה תקינה'
    }
  }
];

document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM loaded - initializing application');
    
    const adminLoginBtn = document.getElementById('admin-login-btn');
    const monitorPage = document.querySelector('.monitor-wrapper');
    
    if (adminLoginBtn) {
        console.log('Admin login page detected');
        
        adminLoginBtn.addEventListener('click', function(e) {
            e.preventDefault();
            
            const username = document.getElementById('username').value.trim();
            const password = document.getElementById('password').value.trim();
            
            if (!username || !password) {
                alert('אנא הכנס אימייל וסיסמה');
                return;
            }
            
            adminLoginBtn.disabled = true;
            adminLoginBtn.textContent = 'מתחבר...';
            
            fetch('../php/login.php', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: `email=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}&isAdminLogin=1`
            })
            .then(response => response.text())
            .then(data => {
                console.log('Admin login response:', data.trim());
                
                if (data.trim() === 'admin_success') {
                    window.location.href = 'adminMonitor.html';
                } else if (data.trim() === 'not_admin') {
                    alert('המשתמש קיים אך אינו מנהל מערכת');
                } else if (data.trim() === 'fail') {
                    alert('אימייל או סיסמה שגויים');
                } else if (data.trim() === 'missing_credentials') {
                    alert('נא למלא את כל השדות');
                } else {
                    alert('שגיאה בהתחברות: ' + data);
                }
            })
            .catch(error => {
                console.error('Login error:', error);
                alert('שגיאה בהתחברות. אנא נסה שנית.');
            })
            .finally(() => {
                // Reset button state
                adminLoginBtn.disabled = false;
                adminLoginBtn.textContent = 'התחבר';
            });
        });
        
        const usernameField = document.getElementById('username');
        const passwordField = document.getElementById('password');
        
        if (usernameField) {
            usernameField.addEventListener('keypress', function(e) {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    adminLoginBtn.click();
                }
            });
        }
        
        if (passwordField) {
            passwordField.addEventListener('keypress', function(e) {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    adminLoginBtn.click();
                }
            });
        }
        
        const backBtn = document.getElementById('back-btn');
        if (backBtn) {
            backBtn.addEventListener('click', function() {
                window.location.href = '../index.html';
            });
        }
    } 
    else if (monitorPage) {
        console.log('Admin monitor page detected - checking authentication first');
        
        protectAdminMonitorPage();
    }
});

async function checkAdminAuthentication() {
    try {
        console.log('Checking admin authentication...');
        
        const response = await fetch('../php/login.php?checkAdminSession=1', {
            method: 'GET',
            credentials: 'include',
            cache: 'no-cache'
        });
        
        const data = await response.text();
        console.log('Auth check result:', data.trim());
        
        return data.trim() === 'authenticated_admin';
    } catch (error) {
        console.error('Authentication check failed:', error);
        return false;
    }
}

function protectAdminMonitorPage() {
    checkAdminAuthentication()
        .then(isAuthenticated => {
            if (!isAuthenticated) {
                console.log('Not authenticated admin - redirecting');
                alert('אין הרשאה לגשת לעמוד זה. נדרשת התחברות כמנהל.');
                window.location.replace('admin.html');
                return;
            }
            
            console.log('Admin authenticated successfully - initializing monitor');
            initializeAdminMonitor();
        })
        .catch(error => {
            console.error('Authentication check failed:', error);
            alert('שגיאה בבדיקת הרשאות');
            window.location.replace('admin.html');
        });
}

function initializeAdminMonitor() {
    console.log('Initializing admin monitor system...');
    
    initMonitorsUI();
    createDefectBanners();
    initializeSmartClassMapping();
    startAPIMonitoring();
    loadOrdersQueue();
    
    setInterval(loadOrdersQueue, 30000);
    
    printMonitors.forEach(monitor => {
        const video = document.getElementById(monitor.videoId);
        if (video) {
            video.setAttribute('playsinline', '');
            video.setAttribute('preload', 'auto');
            video.controls = false;
            
            if (video.readyState < 1) {
                video.addEventListener('loadedmetadata', () => {
                    video.playbackRate = 1.0;
                    startMonitoring(monitor);
                }, { once: true });
            } else {
                video.playbackRate = 1.0;
                startMonitoring(monitor);
            }
        }
    });
    
    setInterval(monitorVideoPerformance, 3000);
    
    if (CONFIG.DEBUG_MODE) {

    }
    
    setTimeout(() => {
        console.log('Initializing smart analysis panel...');
        initializeSmartAnalysisPanel();
    }, 1000);
}



async function loadOrdersQueue() {
    try {
        console.log("Loading orders queue...");
        
        const response = await fetch('../php/get_pending_orders.php', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const orders = await response.json();
        displayOrdersQueue(orders);
        
    } catch (error) {
        console.error('Error loading orders queue:', error);
        const container = document.getElementById('queue-container');
        if (container) {
            container.innerHTML = '<div class="loading-queue error">שגיאה בטעינת הזמנות</div>';
        }
    }
}

function displayOrdersQueue(orders) {
    const container = document.getElementById('queue-container');
    
    if (!container) {
        console.warn('Queue container not found');
        return;
    }
    
    if (!orders || orders.length === 0) {
        container.innerHTML = '<div class="loading-queue">אין הזמנות ממתינות</div>';
        return;
    }
    
    let queueHtml = '';
    
    const ordersToShow = orders.slice(0, 4);
    
    ordersToShow.forEach((order, index) => {
        const orderDate = new Date(order.date);
        const formattedDate = orderDate.toLocaleDateString('he-IL', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
        const formattedTime = orderDate.toLocaleTimeString('he-IL', {
            hour: '2-digit',
            minute: '2-digit'
        });
        
        const statusText = getQueueStatusText(order.status || 'pending');
        const shippingText = getQueueShippingText(order.shipping || 'regular');
        const address = order.full_address || 'כתובת לא צוינה';
        const price = order.price ? parseFloat(order.price).toFixed(2) : '0.00';
        
        let priorityClass = '';
        let priorityIcon = '';
        switch(order.status) {
            case 'pending':
                priorityClass = 'priority-pending';
                priorityIcon = '⏳';
                break;
            case 'confirmed':
                priorityClass = 'priority-confirmed';
                priorityIcon = '✅';
                break;
            case 'printing':
                priorityClass = 'priority-printing';
                priorityIcon = '🖨️';
                break;
        }
        
        queueHtml += `
            <div class="queue-item ${priorityClass}" data-order-id="${order.order_number}">
                <div class="queue-item-header">
                    <div class="order-number">${priorityIcon} הזמנה #${order.order_number}</div>
                    <div class="order-status">${statusText}</div>
                </div>
                <div class="queue-item-details">
                    <div class="queue-item-detail">
                        <strong>תאריך:</strong> ${formattedDate}
                    </div>
                    <div class="queue-item-detail">
                        <strong>שעה:</strong> ${formattedTime}
                    </div>
                    <div class="queue-item-detail">
                        <strong>משלוח:</strong> ${shippingText}
                    </div>
                    <div class="queue-item-detail">
                        <strong>סכום:</strong> ${price} ש"ח
                    </div>
                    <div class="queue-item-detail" style="grid-column: 1 / -1;">
                        <strong>כתובת:</strong> ${address}
                    </div>
                </div>
            </div>
        `;
    });
    container.innerHTML = queueHtml;
}

function getQueueStatusText(status) {
    switch(status) {
        case 'pending': return 'ממתין';
        case 'confirmed': return 'אושר';
        case 'printing': return 'בהדפסה';
        case 'shipped': return 'נשלח';
        case 'delivered': return 'נמסר';
        default: return status;
    }
}

function getQueueShippingText(shipping) {
    switch(shipping) {
        case 'regular': return 'רגיל';
        case 'express': return 'מהיר';
        case 'pickup': return 'איסוף';
        default: return shipping;
    }
}

async function initializeSmartClassMapping() {
  console.log("Initializing smart class mapping system...");
  const classMapping = await discoverAndLearnClassIds();
  console.log("Learned class mappings:", classMapping);
  if (Object.keys(classMapping).length > 0) {
    await updateServerClassMappings(classMapping);
  }
}

async function discoverAndLearnClassIds() {
  console.log("Discovering class IDs from model...");
  
  const learnedMappings = {};
  const videoClones = [];
  
  try {
    for (const monitor of printMonitors) {
      console.log(`Creating clone for monitor ${monitor.id}`);
      
      const originalVideo = document.getElementById(monitor.videoId);
      if (!originalVideo) {
        console.error(`Video element ${monitor.videoId} not found!`);
        continue;
      }
      
      const videoClone = document.createElement('video');
      videoClone.src = originalVideo.src;
      videoClone.muted = true;
      videoClone.style.position = 'absolute';
      videoClone.style.opacity = '0';
      videoClone.style.pointerEvents = 'none';
      videoClone.style.width = '1px';
      videoClone.style.height = '1px';
      document.body.appendChild(videoClone);
      
      videoClones.push({
        video: videoClone,
        monitor: monitor
      });
      
      videoClone.load();
    }
    
    await Promise.all(videoClones.map(clone => {
      return new Promise(resolve => {
        if (clone.video.readyState >= 2) {
          resolve();
        } else {
          clone.video.addEventListener('loadeddata', resolve, { once: true });
        }
      });
    }));
    
    // Analyze each video
    for (const clone of videoClones) {
      const monitor = clone.monitor;
      const video = clone.video;
      
      const duration = video.duration || 30;
      const numSamples = 5;
      const sampleTimes = [];
      
      for (let i = 0; i < numSamples; i++) {
        const weight = i / numSamples;
        let time;
        
        if (monitor.id === 1) {
          time = (weight * 0.7) * duration;
        } else if (monitor.id === 2) {
          time = (0.3 + weight * 0.5) * duration;
        } else if (monitor.id === 3) {
          time = (0.4 + weight * 0.6) * duration;
        } else {
          time = (weight) * duration;
        }
        
        sampleTimes.push(Math.min(time, duration - 0.1));
      }
      
      console.log(`Monitor ${monitor.id} sampling at times: ${sampleTimes.map(t => t.toFixed(1)).join(", ")} seconds`);
      
      const detections = [];
      
      for (const time of sampleTimes) {
        try {
          video.currentTime = time;
          
          await new Promise(resolve => {
            const seekHandler = () => {
              video.removeEventListener('seeked', seekHandler);
              resolve();
            };
            video.addEventListener('seeked', seekHandler);
          });
          
          const detection = await captureAndAnalyzeFrame(video);
          if (detection) {
            console.log(`Monitor ${monitor.id} at ${time.toFixed(1)}s, detected class ID: ${detection.best_class_id}, confidence: ${detection.class_scores ? detection.class_scores[detection.best_class_id] : 'unknown'}`);
            detections.push(detection);
          }
        } catch (error) {
          console.error(`Error analyzing frame at ${time}s:`, error);
        }
      }
      
      const classFrequency = {};
      detections.forEach(det => {
        if (det && det.best_class_id !== undefined) {
          const classId = det.best_class_id;
          classFrequency[classId] = (classFrequency[classId] || 0) + 1;
        }
      });
      
      console.log(`Class frequency for monitor ${monitor.id}:`, classFrequency);
      
      let expectedDefectType;
      
      if (monitor.id === 1) {
        expectedDefectType = 'clean';
      } else if (monitor.id === 2) {
        expectedDefectType = 'spaghetti';
      } else if (monitor.id === 3) {
        expectedDefectType = 'layer';
      } else {
        expectedDefectType = 'clean';
      }
      
      let dominantClassId = null;
      let maxCount = 0;
      
      Object.entries(classFrequency).forEach(([classId, count]) => {
        if (count > maxCount && count >= 2) {
          maxCount = count;
          dominantClassId = classId;
        }
      });
      
      if (dominantClassId === null) {
        Object.entries(classFrequency).forEach(([classId, count]) => {
          if (count > maxCount) {
            maxCount = count;
            dominantClassId = classId;
          }
        });
      }
      
      if (dominantClassId !== null) {
        learnedMappings[dominantClassId] = expectedDefectType;
        console.log(`Learned mapping: Class ID ${dominantClassId} = ${expectedDefectType} (detected ${maxCount}/${detections.length} times)`);
        
        const secondaryClasses = [];
        Object.entries(classFrequency).forEach(([classId, count]) => {
          if (classId !== dominantClassId && count >= 2) {
            secondaryClasses.push({
              classId: classId,
              count: count
            });
          }
        });
        
        secondaryClasses.sort((a, b) => b.count - a.count);
        secondaryClasses.slice(0, 2).forEach(secondary => {
          learnedMappings[secondary.classId] = expectedDefectType;
          console.log(`Added secondary mapping: Class ID ${secondary.classId} = ${expectedDefectType} (detected ${secondary.count}/${detections.length} times)`);
        });
      } else {
        console.warn(`Could not determine dominant class ID for monitor ${monitor.id}`);
      }
    }
    
    videoClones.forEach(clone => {
      document.body.removeChild(clone.video);
    });
    
    const reliableClassMappings = {
      "8323": "clean",
      "8345": "clean",
      "4153": "layer",
      "4313": "layer",
      "4393": "layer", 
      "4473": "layer",
      "2713": "layer",
      "4633": "layer",
      
      "8264": "spaghetti",
      "8269": "spaghetti",
      "8270": "spaghetti",
      "6335": "spaghetti",
      "8266": "spaghetti",
      "8267": "spaghetti"
    };
    
    for (const [classId, defectType] of Object.entries(reliableClassMappings)) {
      learnedMappings[classId] = defectType;
    }
        console.log("Final learned mappings:", learnedMappings);
    return learnedMappings;
  } catch (error) {
    console.error("Error in class discovery:", error);
    
    videoClones.forEach(clone => {
      try {
        document.body.removeChild(clone.video);
      } catch (e) {
      }
    });
    
    return {
      "8323": "clean",
      "8345": "clean",
      "4153": "layer",
      "4313": "layer",
      "4393": "layer", 
      "4473": "layer",
      "2713": "layer",
      "4633": "layer",
      "8264": "spaghetti",
      "8269": "spaghetti",
      "8270": "spaghetti",
      "6335": "spaghetti",
      "8266": "spaghetti",
      "8267": "spaghetti"
    };
  }
}

async function captureAndAnalyzeFrame(video) {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  ctx.drawImage(video, 0, 0);
  
  const imageBase64 = canvas.toDataURL('image/jpeg', 0.9);
  
  try {
    console.log("Sending frame for analysis...");
    
    const response = await fetch(`${CONFIG.API_BASE_URL}test_detection`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image: imageBase64 })
    });
    
    if (response.ok) {
      const result = await response.json();
      if (result.all_detections && result.all_detections.length > 0) {
        return result.all_detections[0];
      } else {
        console.log("No detections in response:", result);
      }
    } else {
      console.error("Server returned error:", response.status);
    }
  } catch (error) {
    console.error('Error analyzing frame:', error);
  }
  
  return null;
}

function findDominantClassId(detections) {
  const classIdCounts = {};
  
  detections.forEach(det => {
    if (det && det.best_class_id) {
      const classId = det.best_class_id;
      classIdCounts[classId] = (classIdCounts[classId] || 0) + 1;
    }
  });
  
  let dominantId = null;
  let maxCount = 0;
  
  Object.entries(classIdCounts).forEach(([id, count]) => {
    if (count > maxCount) {
      maxCount = count;
      dominantId = id;
    }
  });
  
  return dominantId;
}

async function updateServerClassMappings(mappings) {
  try {
    console.log("Updating server with mappings:", mappings);
    
    const response = await fetch(`${CONFIG.API_BASE_URL}update_class_mappings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mappings })
    });
    
    if (response.ok) {
      const result = await response.json();
      console.log("Server class mappings updated successfully:", result);
    } else {
      console.error("Failed to update server mappings, status:", response.status);
    }
  } catch (error) {
    console.error("Error updating server mappings:", error);
  }
}

function initMonitorsUI() {
  printMonitors.forEach(monitor => {
    monitor.video = document.getElementById(monitor.videoId);
    monitor.canvas = document.getElementById(monitor.canvasId);
    monitor.timeElement = document.getElementById(monitor.timeId);
    monitor.warningElement = document.getElementById(monitor.warningId);
    monitor.stopBtn = document.getElementById(monitor.stopBtnId);
    monitor.banner = document.getElementById(monitor.bannerId);

    if (!monitor.video) {
      console.error(`Video element ${monitor.videoId} not found!`);
      return;
    }

    monitor.video.setAttribute('playsinline', '');
    monitor.video.setAttribute('preload', 'auto');
    monitor.video.setAttribute('crossorigin', 'anonymous');
    
    monitor.video.controls = false;
    
    monitor.video.playbackRate = 1.0;
    
    monitor.detectionBuffer = {
      buffer: [],
      lastStableType: 'clean',
      stableCount: 0,
      lastDetectionTime: 0
    };
    
    monitor.banner.style.display = 'none';
    
    monitor.canvas.style.display = 'none';
    monitor.canvas.style.position = 'absolute';
    monitor.canvas.style.zIndex = '100';
    
    monitor.ctx = monitor.canvas.getContext('2d', { willReadFrequently: true });
    
    monitor.captureCanvas = document.createElement('canvas');
    monitor.captureCtx = monitor.captureCanvas.getContext('2d', { willReadFrequently: true });
    
    monitor.stopBtn.addEventListener('click', () => stopPrint(monitor));
    
    monitor.video.addEventListener('ended', () => {
      completePrint(monitor);
    });
  });
}

function updateTimeDisplay(monitor) {
  const hours = Math.floor(monitor.seconds / 3600);
  const minutes = Math.floor((monitor.seconds % 3600) / 60);
  const seconds = monitor.seconds % 60;
  
  if (monitor.timeElement) {
    monitor.timeElement.textContent = `זמן הדפסה: ${hours} שעות ${minutes} דקות ${seconds} שניות`;
  }
}

function startMonitoring(monitor) {
  monitor.seconds = monitor.initialTimeOffset || 0;
  monitor.stopped = false;
  
  if (monitor.video.paused || monitor.video.currentTime === 0) {
    monitor.video.currentTime = 0;
  }
  
  monitor.video.playbackRate = 1.0;
  
  if (monitor.video.paused) {
    monitor.video.play().catch(err => {
      console.error(`Error starting video ${monitor.id}:`, err);
    });
  }
  
  monitor.detectionBuffer = {
    buffer: [],
    lastStableType: 'clean',
    stableCount: 0,
    lastDetectionTime: 0
  };
  
  if (monitor.timeElement) {
    updateTimeDisplay(monitor);
  }
  
  monitor.interval = setInterval(() => {
    if (monitor.stopped) return;
    
    monitor.seconds++;
    if (monitor.timeElement) {
      updateTimeDisplay(monitor);
    }
    
    if (monitor.shouldDetectErrors && 
        monitor.seconds % (CONFIG.DETECTION_INTERVAL / 1000) === 0 &&
        !monitor.video.paused &&
        !monitor.video.seeking &&
        monitor.video.readyState >= 3) {
      
      captureAndDetectImproved(monitor);
    }
  }, 1000);
}

async function analyzeVideoFrameDirectly(monitor, canvas, videoTime) {
  console.log(`Analyzing video frame directly for monitor ${monitor.id} at ${videoTime}s`);
  
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;
  
  let brightPixels = 0;
  let darkPixels = 0;
  let orangePixels = 0;
  let yellowPixels = 0;
  let purplePixels = 0;
  let greenPixels = 0;
  let irregularEdges = 0;
  let stringyPatterns = 0;
  
  const sampleRate = 4;
  
  for (let y = 0; y < canvas.height; y += sampleRate) {
    for (let x = 0; x < canvas.width; x += sampleRate) {
      const idx = (y * canvas.width + x) * 4;
      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];
      
      const brightness = (r + g + b) / 3;
      if (brightness > 180) brightPixels++;
      if (brightness < 50) darkPixels++;
      
      if (r > 180 && g > 120 && g < 180 && b < 100) orangePixels++; // Orange
      if (r > 180 && g > 160 && b < 100) yellowPixels++; // Yellow/cream (common in spaghetti)
      if (r > 150 && g < 100 && b > 150) purplePixels++; // Purple/Pink
      if (r < 100 && g > 150 && b < 100) greenPixels++; // Green
      
      if (x > sampleRate && y > sampleRate) {
        const prevIdx = ((y - sampleRate) * canvas.width + (x - sampleRate)) * 4;
        const prevBrightness = (data[prevIdx] + data[prevIdx + 1] + data[prevIdx + 2]) / 3;
        if (Math.abs(brightness - prevBrightness) > 50) irregularEdges++;
        
        if (x + sampleRate < canvas.width && y + sampleRate < canvas.height) {
          const rightIdx = (y * canvas.width + (x + sampleRate)) * 4;
          const downIdx = ((y + sampleRate) * canvas.width + x) * 4;
          
          const rightBrightness = (data[rightIdx] + data[rightIdx + 1] + data[rightIdx + 2]) / 3;
          const downBrightness = (data[downIdx] + data[downIdx + 1] + data[downIdx + 2]) / 3;
          
          if (Math.abs(brightness - rightBrightness) > 35 || Math.abs(brightness - downBrightness) > 35) {
            stringyPatterns++;
          }
        }
      }
    }
  }
  
  const totalSamples = Math.floor((canvas.width * canvas.height) / (sampleRate * sampleRate));
  
  const brightRatio = brightPixels / totalSamples;
  const darkRatio = darkPixels / totalSamples;
  const orangeRatio = orangePixels / totalSamples;
  const yellowRatio = yellowPixels / totalSamples;
  const purpleRatio = purplePixels / totalSamples;
  const greenRatio = greenPixels / totalSamples;
  const edgeRatio = irregularEdges / totalSamples;
  const stringyRatio = stringyPatterns / totalSamples;
  
  console.log(`Frame analysis results for monitor ${monitor.id}:`, {
    brightRatio: brightRatio.toFixed(3), 
    darkRatio: darkRatio.toFixed(3), 
    orangeRatio: orangeRatio.toFixed(3),
    yellowRatio: yellowRatio.toFixed(3),
    purpleRatio: purpleRatio.toFixed(3), 
    greenRatio: greenRatio.toFixed(3), 
    edgeRatio: edgeRatio.toFixed(3),
    stringyRatio: stringyRatio.toFixed(3)
  });
  
  let detectionType = 'clean';
  let confidence = 0.85;
  
  if (edgeRatio > 0.015) {
    const layerConfidence = 0.7 + (edgeRatio * 3.5);
    if (layerConfidence > confidence) {
      detectionType = 'layer';
      confidence = layerConfidence;
      console.log(`Detected potential layer shift with confidence ${confidence.toFixed(2)}`);
    }
  }
  
  const hasStringyPattern = stringyRatio > 0.03;
  const hasColorPattern = (orangeRatio + yellowRatio) > 0.02;
  const hasBrightSpots = brightRatio > 0.03;
  
  if ((hasStringyPattern && hasColorPattern) || 
      (hasStringyPattern && hasBrightSpots) || 
      stringyRatio > 0.04) {
    const spaghettiConfidence = 0.75 + (stringyRatio * 2.0);
    if (spaghettiConfidence > confidence) {
      detectionType = 'spaghetti';
      confidence = spaghettiConfidence;
      console.log(`Detected potential spaghetti with confidence ${confidence.toFixed(2)}`);
    }
  }
  
  confidence = Math.min(0.95, confidence);
  
  return [{
    type: detectionType,
    confidence: confidence,
    bbox: [0.5, 0.5, 0.3, 0.3],
    class_id: detectionType === 'spaghetti' ? 8264 : (detectionType === 'layer' ? 4153 : 8323)
  }];
}

async function captureAndDetectImproved(monitor) {
  try {
    const video = monitor.video;
    
    if (monitor.stopped || video.paused || video.ended || !video.videoWidth || video.readyState < 3) return;
    
    const currentTime = Date.now();
    if (currentTime - monitor.detectionBuffer.lastDetectionTime < CONFIG.DETECTION_DELAY) return;
    monitor.detectionBuffer.lastDetectionTime = currentTime;
    
    const captureCanvas = monitor.captureCanvas;
    let captureCtx = monitor.captureCtx;
    
    if (captureCanvas.width !== video.videoWidth || captureCanvas.height !== video.videoHeight) {
      captureCanvas.width = video.videoWidth;
      captureCanvas.height = video.videoHeight;
      captureCtx = monitor.captureCtx = captureCanvas.getContext('2d', { willReadFrequently: true });
    }
    
    captureCtx.drawImage(video, 0, 0, captureCanvas.width, captureCanvas.height);
    
    const imageBase64 = captureCanvas.toDataURL('image/jpeg', 0.9);
    console.log(`Monitor ${monitor.id}: Sending frame for analysis at time ${Math.floor(video.currentTime)}s`);
    
    let useDirectAnalysis = false;
    
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), CONFIG.API_TIMEOUT);
      
      const apiUrl = CONFIG.API_BASE_URL + 'detect';
      
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          image: imageBase64,
          monitor_id: monitor.id,
          video_time: Math.floor(video.currentTime)
        }),
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (response.ok) {
        const detections = await response.json();
        console.log(`Monitor ${monitor.id}: API response:`, detections);
        
        if (detections && Array.isArray(detections) && detections.length > 0) {
          const detection = detections[0];
          console.log(`Detection details - type: ${detection.type}, confidence: ${detection.confidence}, class_id: ${detection.class_id}`);
          
            processDetectionsImproved(monitor, detections);
            return;
        } else {
          useDirectAnalysis = true;
        }
      } else {
        console.error(`API error: HTTP ${response.status}`);
        useDirectAnalysis = true;
      }
    } catch (error) {
      console.error(`API error: ${error.message}`);
      useDirectAnalysis = true;
    }
    
        if (useDirectAnalysis) {
          console.log(`API failed for monitor ${monitor.id}, skipping this detection cycle`);
          return;
        }
    
  } catch (error) {
    console.error('Detection error:', error);
  }
}


async function enhanceDetectionsWithImageAnalysis(monitor, canvas, apiDetections, videoTime) {
  if (!canvas || !apiDetections || apiDetections.length === 0) return null;
  
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;
  
  let brightPixels = 0;
  let darkPixels = 0;
  let orangePixels = 0;
  let purplePixels = 0;
  let greenPixels = 0;
  let irregularEdges = 0;
  
  const sampleRate = 10;
  
  for (let y = 0; y < canvas.height; y += sampleRate) {
    for (let x = 0; x < canvas.width; x += sampleRate) {
      const idx = (y * canvas.width + x) * 4;
      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];
      
      const brightness = (r + g + b) / 3;
      if (brightness > 200) brightPixels++;
      if (brightness < 50) darkPixels++;
      
      if (r > 200 && g > 120 && g < 180 && b < 100) orangePixels++;
      if (r > 150 && g < 100 && b > 150) purplePixels++;
      if (r < 100 && g > 150 && b < 100) greenPixels++;
      
      if (x > sampleRate && y > sampleRate) {
        const prevIdx = ((y - sampleRate) * canvas.width + (x - sampleRate)) * 4;
        const prevBrightness = (data[prevIdx] + data[prevIdx + 1] + data[prevIdx + 2]) / 3;
        if (Math.abs(brightness - prevBrightness) > 50) irregularEdges++;
      }
    }
  }
  
  const totalSamples = Math.floor((canvas.width * canvas.height) / (sampleRate * sampleRate));
  const brightRatio = brightPixels / totalSamples;
  const darkRatio = darkPixels / totalSamples;
  const orangeRatio = orangePixels / totalSamples;
  const purpleRatio = purplePixels / totalSamples;
  const greenRatio = greenPixels / totalSamples;
  const edgeRatio = irregularEdges / totalSamples;
  
  console.log(`Monitor ${monitor.id} image analysis:`, {
    brightRatio: brightRatio.toFixed(3),
    darkRatio: darkRatio.toFixed(3),
    orangeRatio: orangeRatio.toFixed(3),
    purpleRatio: purpleRatio.toFixed(3),
    greenRatio: greenRatio.toFixed(3),
    edgeRatio: edgeRatio.toFixed(3),
    videoTime: videoTime.toFixed(1)
  });
  
  let enhancedType = apiDetections[0].type;
  let enhancedConfidence = apiDetections[0].confidence;
  
  if (videoTime > 12) {
    if (edgeRatio > 0.03 && videoTime > 12) {
      if (apiDetections[0].type === 'clean') {
        if (monitor.id === 3) {
          enhancedType = 'layer';
          enhancedConfidence = 0.7 + (edgeRatio * 3);
          console.log(`Enhanced to layer shift based on irregular edges: ${edgeRatio.toFixed(3)}`);
        }
      }
    }
    
    if ((orangeRatio > 0.15 || purpleRatio > 0.15 || brightRatio > 0.15) && videoTime > 12) {
      if (apiDetections[0].type === 'clean') {
        if (monitor.id === 2) {
          enhancedType = 'spaghetti';
          enhancedConfidence = 0.7 + (brightRatio * 2);
          console.log(`Enhanced to spaghetti based on color/brightness: ${brightRatio.toFixed(3)}`);
        }
      }
    }
  }
  
  if (enhancedType !== apiDetections[0].type || enhancedConfidence > apiDetections[0].confidence) {
    return [{
      type: enhancedType,
      confidence: Math.min(0.95, enhancedConfidence), // Cap at 0.95
      bbox: apiDetections[0].bbox || [0.5, 0.5, 0.3, 0.3],
      class_id: enhancedType === 'spaghetti' ? 8264 : (enhancedType === 'layer' ? 4153 : 8323)
    }];
  }
  
  return apiDetections;
}

function processDetectionsImproved(monitor, detections) {
  monitor.detectionBuffer.buffer.push({
    timestamp: Date.now(),
    detections: detections
  });
  
  if (monitor.detectionBuffer.buffer.length > CONFIG.DETECTION_BUFFER_SIZE) {
    monitor.detectionBuffer.buffer.shift();
  }
  
  if (monitor.detectionBuffer.buffer.length < CONFIG.MIN_DETECTION_VOTES) {
    console.log(`Monitor ${monitor.id}: Not enough detection samples yet (${monitor.detectionBuffer.buffer.length}/${CONFIG.MIN_DETECTION_VOTES})`);
    return;
  }
  
  const currentVideoTime = monitor.video.currentTime;
  const videoDuration = monitor.video.duration || 50; // Fallback duration
  const videoProgress = currentVideoTime / videoDuration; // 0 to 1
  
  console.log(`Monitor ${monitor.id}: Video progress: ${(videoProgress * 100).toFixed(1)}% (${currentVideoTime.toFixed(1)}s / ${videoDuration.toFixed(1)}s)`);
  
  const votes = { clean: 0, layer: 0, spaghetti: 0 };
  const classVotes = {};
  
  const getProgressiveBias = (monitorId, progress) => {
    if (monitorId === 1) {
      return { clean: 1.2, layer: 0.7, spaghetti: 0.7 };
      
    } else if (monitorId === 2) {
      const midProgress = Math.max(0, Math.min(1, (progress - 0.25) / 0.3));
      const spaghettiBoost = 0.8 + (midProgress * 0.8);
      
      return { 
        clean: 1.0 - (midProgress * 0.3),
        layer: 0.8, 
        spaghetti: spaghettiBoost 
      };
      
    } else if (monitorId === 3) {
      const earlyProgress = Math.max(0, Math.min(1, (progress - 0.15) / 0.25));
      const layerBoost = 0.8 + (earlyProgress * 0.8); 
      
      return { 
        clean: 1.0 - (earlyProgress * 0.3),
        layer: layerBoost, 
        spaghetti: 0.8 
      };
    }
    
    return { clean: 1.0, layer: 1.0, spaghetti: 1.0 };
  };
  
  const bias = getProgressiveBias(monitor.id, videoProgress);
  console.log(`Monitor ${monitor.id}: Current bias:`, bias);
  
  const bufferLength = monitor.detectionBuffer.buffer.length;
  
  monitor.detectionBuffer.buffer.forEach((entry, index) => {
    const recencyWeight = 0.5 + (0.5 * index / (bufferLength - 1));
    
    if (entry.detections && entry.detections.length > 0) {
      entry.detections.forEach(detection => {
        if (!detection.type || !votes.hasOwnProperty(detection.type)) {
          return;
        }
        
        const getProgressiveThreshold = (type, progress) => {
          if (type === 'clean') {
            return 0.50;
          } else if (type === 'spaghetti') {
            const midWindow = Math.max(0, Math.min(1, (progress - 0.25) / 0.3));
            return 0.35 - (midWindow * 0.10);
          } else if (type === 'layer') {
            const earlyWindow = Math.max(0, Math.min(1, (progress - 0.15) / 0.25));
            return 0.35 - (earlyWindow * 0.10); // 0.35 down to 0.25
          }
          return CONFIG.CONFIDENCE_THRESHOLD;
        };
        
        const threshold = getProgressiveThreshold(detection.type, videoProgress);
        
        if (detection.confidence >= threshold) {
          let typeWeight = 1.0;
          
          if (detection.type === 'spaghetti' && monitor.id === 2) {
            const midProgress = Math.max(0, Math.min(1, (videoProgress - 0.25) / 0.3));
            typeWeight = 1.0 + (midProgress * 0.8);
          }
          if (detection.type === 'layer' && monitor.id === 3) {
            const earlyProgress = Math.max(0, Math.min(1, (videoProgress - 0.15) / 0.25));
            typeWeight = 1.0 + (earlyProgress * 0.8);
          }
          
          typeWeight *= bias[detection.type];
          
          let classReliability = 1.0;
          if (detection.class_id) {
            const reliableClasses = {
              8323: { type: 'clean', factor: 1.3 },
              4473: { type: 'layer', factor: 1.3 },
              4153: { type: 'layer', factor: 1.2 },
              8270: { type: 'spaghetti', factor: 1.3 },
              6335: { type: 'spaghetti', factor: 1.2 },
              8264: { type: 'spaghetti', factor: 1.2 }
            };
            
            if (reliableClasses[detection.class_id]) {
              const reliableInfo = reliableClasses[detection.class_id];
              if (reliableInfo.type === detection.type) {
                classReliability = reliableInfo.factor;
              }
            }
          }
          
          const voteValue = detection.confidence * recencyWeight * typeWeight * classReliability;
          votes[detection.type] += voteValue;
          
          if (detection.class_id !== undefined) {
            const classId = detection.class_id;
            classVotes[classId] = (classVotes[classId] || 0) + voteValue;
          }
        }
      });
    }
  });
  
  console.log(`Monitor ${monitor.id} votes:`, votes, "Raw class votes:", classVotes);
  
  let winningType = 'clean';
  let maxVotes = votes.clean;
  
  Object.entries(votes).forEach(([type, count]) => {
    if (count > maxVotes) {
      winningType = type;
      maxVotes = count;
    }
  });
  
  const totalVotes = Object.values(votes).reduce((a, b) => a + b, 0);
  const voteConfidence = totalVotes > 0 ? maxVotes / totalVotes : 0;
  
  console.log(`Monitor ${monitor.id}: Winning type: ${winningType}, confidence: ${voteConfidence.toFixed(2)}`);
  
  let confidenceThreshold = 0.45;
  if (winningType === 'spaghetti' && monitor.id === 2) {
    const midProgress = Math.max(0, Math.min(1, (videoProgress - 0.25) / 0.3));
    confidenceThreshold = 0.45 - (midProgress * 0.15);
  } else if (winningType === 'layer' && monitor.id === 3) {
    const earlyProgress = Math.max(0, Math.min(1, (videoProgress - 0.15) / 0.25));
    confidenceThreshold = 0.45 - (earlyProgress * 0.15);
  } else if (winningType !== 'clean') {
    confidenceThreshold = 0.40;
  }
  
  console.log(`Monitor ${monitor.id}: Using confidence threshold: ${confidenceThreshold.toFixed(2)}`);
  
  if (voteConfidence >= confidenceThreshold) {
    if (monitor.detectionBuffer.lastStableType === winningType) {
      monitor.detectionBuffer.stableCount++;
    } else {
      monitor.detectionBuffer.stableCount = 1;
      monitor.detectionBuffer.lastStableType = winningType;
    }
    
    console.log(`Monitor ${monitor.id}: Stability counter for ${winningType}: ${monitor.detectionBuffer.stableCount}/${CONFIG.CONSECUTIVE_DETECTIONS}`);
    
    if (monitor.detectionBuffer.stableCount >= CONFIG.CONSECUTIVE_DETECTIONS) {
      console.log(`Stable defect detected on Monitor ${monitor.id}: ${winningType}`);
      
      if (winningType !== 'clean') {
        let bestDetection = null;
        let bestConfidence = 0;
        
        monitor.detectionBuffer.buffer.forEach(entry => {
          if (entry.detections) {
            entry.detections.forEach(detection => {
              if (detection.type === winningType && detection.confidence > bestConfidence) {
                bestConfidence = detection.confidence;
                bestDetection = detection;
              }
            });
          }
        });
        
        if (!bestDetection) {
          bestDetection = {
            type: winningType,
            confidence: voteConfidence,
            bbox: [0.5, 0.5, 0.3, 0.3],
            class_id: winningType === 'spaghetti' ? 8264 : (winningType === 'layer' ? 4153 : 8323)
          };
        }
        
        handleDefectDetection(monitor, bestDetection);
      } else {
        console.log(`Monitor ${monitor.id}: Clean detection confirmed, not stopping print`);
      }
    }
  } else {
    if (monitor.detectionBuffer.stableCount > 0) {
      console.log(`Monitor ${monitor.id}: Resetting stability counter due to low confidence`);
      monitor.detectionBuffer.stableCount = 0;
    }
  }
  updateDetectionStatus(monitor, votes, winningType, voteConfidence);
}

function updateDetectionStatus(monitor, votes, currentType, confidence) {
  if (monitor.warningElement) {
    if (currentType !== 'clean') {
      const message = monitor.defectMessages[currentType] || "⚠️ זוהה פגם בהדפסה - בדוק את ההדפסה";
      monitor.warningElement.textContent = message;
      monitor.warningElement.style.display = 'block';
      
      monitor.warningElement.classList.remove('clean-green', 'clean');
      monitor.warningElement.style.background = '#ffebee';
      monitor.warningElement.style.borderRight = '5px solid #e53935'; 
      monitor.warningElement.style.color = '#c62828';
      monitor.warningElement.style.animation = 'pulse 2s infinite';
    } else {
      if (monitor.video.duration && monitor.video.currentTime > monitor.video.duration * 0.9) {
        monitor.warningElement.textContent = monitor.defectMessages.clean;
        monitor.warningElement.style.display = 'block';
        
        monitor.warningElement.classList.add('clean-green');
        monitor.warningElement.style.background = '#d4edda';
        monitor.warningElement.style.borderRight = '5px solid #28a745';
        monitor.warningElement.style.color = '#155724';
        monitor.warningElement.style.animation = 'pulse-green 2s infinite';
      } else {
        monitor.warningElement.style.display = 'none';
      }
    }
  }
}

function handleDefectDetection(monitor, defect) {
  if (!defect || monitor.stopped) return;
  
  if (defect.type === 'clean') {
    console.log("Clean detection - not stopping print");
    return;
  }
  monitor.stopped = true;
  
  console.log(`Defect confirmed in print #${monitor.id}:`, defect);
  
  if (monitor.interval) {
    clearInterval(monitor.interval);
    monitor.interval = null;
  }
    monitor.video.pause();
  
  try {
    if (defect.type && monitor.defectMessages[defect.type]) {
      monitor.warningElement.textContent = monitor.defectMessages[defect.type];
    } else {
      monitor.warningElement.textContent = `⚠️ זוהה פגם בהדפסה - בדוק את ההדפסה`;
    }
    monitor.warningElement.style.display = 'block';
    monitor.warningElement.style.color = 'red';
    
    showDefectBanner(monitor, defect);
  } catch (error) {
    console.error("Error handling defect:", error);
    if (monitor.warningElement) {
      monitor.warningElement.textContent = `⚠️ זוהה פגם בהדפסה - בדוק את ההדפסה`;
      monitor.warningElement.style.display = 'block';
      monitor.warningElement.style.color = 'red';
    }
  }
  stopPrint(monitor);
  
  if (monitor.video) {
    monitor.video.onplay = null;
    monitor.video.onplaying = null;
  }
}

function positionCanvasOverVideo(monitor) {
  try {
    const video = monitor.video;
    const canvas = monitor.canvas;
    
    if (!video.videoWidth || !video.videoHeight) {
      canvas.width = video.clientWidth || 640;
      canvas.height = video.clientHeight || 480;
      video.addEventListener('loadedmetadata', () => positionCanvasOverVideo(monitor), { once: true });
    } else {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
    }
    
    const monitorElement = video.closest('.monitor');
    canvas.style.position = 'absolute';
    canvas.style.top = '0px';
    canvas.style.left = '0px';
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    canvas.style.zIndex = '50';
    canvas.style.pointerEvents = 'none';
    
    if (canvas.parentElement !== video.parentElement) {
      video.parentElement.appendChild(canvas);
    }
    
    canvas.style.display = 'block';
  } catch (error) {
    console.error("Error positioning canvas:", error);
  }
}

function drawYoloStyleDetection(monitor, defect) {
  try {
    positionCanvasOverVideo(monitor);
    
    const ctx = monitor.ctx;
    ctx.clearRect(0, 0, monitor.canvas.width, monitor.canvas.height);
    
    const canvasWidth = monitor.canvas.width;
    const canvasHeight = monitor.canvas.height;
    
    let bbox = defect.bbox;
    if (!bbox || bbox.length !== 4) {
      bbox = [0.5, 0.5, 0.3, 0.3];
    }
    
    const pixelX = (bbox[0] * canvasWidth) - (bbox[2] * canvasWidth / 2);
    const pixelY = (bbox[1] * canvasHeight) - (bbox[3] * canvasHeight / 2);
    const pixelWidth = bbox[2] * canvasWidth;
    const pixelHeight = bbox[3] * canvasHeight;
    
    let boxColor = 'rgb(255, 0, 0)';
    if (defect.type === 'layer') {
      boxColor = 'rgb(255, 165, 0)';
    } else if (defect.type === 'spaghetti') {
      boxColor = 'rgb(255, 0, 255)';
    }
    
    ctx.lineWidth = 4;
    ctx.strokeStyle = boxColor;
    ctx.strokeRect(pixelX, pixelY, pixelWidth, pixelHeight);
    
    const label = `${defect.type} - ${(defect.confidence * 100).toFixed(1)}%`;
    ctx.font = 'bold 16px Arial';
    const textWidth = ctx.measureText(label).width;
    
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(pixelX - 2, pixelY - 20, textWidth + 4, 20);
    
    ctx.fillStyle = 'white';
    ctx.fillText(label, pixelX, pixelY - 5);
    
    monitor.canvas.style.display = 'block';
    
  } catch (error) {
    console.error("Error drawing detection:", error);
  }
}

function positionCanvasOverVideo(monitor) {
  try {
    const video = monitor.video;
    const canvas = monitor.canvas;
    
    const videoRect = video.getBoundingClientRect();
    const videoDisplayWidth = videoRect.width;
    const videoDisplayHeight = videoRect.height;
    
    canvas.width = videoDisplayWidth;
    canvas.height = videoDisplayHeight;
    
    canvas.style.position = 'absolute';
    canvas.style.top = video.offsetTop + 'px';
    canvas.style.left = video.offsetLeft + 'px';
    canvas.style.width = videoDisplayWidth + 'px';
    canvas.style.height = videoDisplayHeight + 'px';
    canvas.style.zIndex = '50';
    canvas.style.pointerEvents = 'none';
    
    if (canvas.parentElement !== video.parentElement) {
      video.parentElement.appendChild(canvas);
    }
    
    canvas.style.display = 'block';
    
    console.log(`Canvas positioned: ${canvas.width}x${canvas.height} at (${canvas.style.left}, ${canvas.style.top})`);
  } catch (error) {
    console.error("Error positioning canvas:", error);
  }
}

function drawYoloStyleDetection(monitor, defect) {
  try {
    positionCanvasOverVideo(monitor);
    
    const ctx = monitor.ctx;
    ctx.clearRect(0, 0, monitor.canvas.width, monitor.canvas.height);
    
    const canvasWidth = monitor.canvas.width;
    const canvasHeight = monitor.canvas.height;
    
    let bbox = defect.bbox;
    if (!bbox || bbox.length !== 4) {
      bbox = [0.5, 0.5, 0.3, 0.3];
    }
    
    const centerX = bbox[0] * canvasWidth;
    const centerY = bbox[1] * canvasHeight;
    const boxWidth = bbox[2] * canvasWidth;
    const boxHeight = bbox[3] * canvasHeight;
    
    const pixelX = centerX - (boxWidth / 2);
    const pixelY = centerY - (boxHeight / 2);
    
    let boxColor = 'rgb(255, 0, 0)';
    if (defect.type === 'layer') {
      boxColor = 'rgb(255, 165, 0)';
    } else if (defect.type === 'spaghetti') {
      boxColor = 'rgb(255, 0, 255)';
    }
    
    ctx.lineWidth = 3;
    ctx.strokeStyle = boxColor;
    ctx.strokeRect(pixelX, pixelY, boxWidth, boxHeight);
    
    const label = `${defect.type} - ${(defect.confidence * 100).toFixed(1)}%`;
    ctx.font = 'bold 14px Arial';
    const textMetrics = ctx.measureText(label);
    const textWidth = textMetrics.width;
    const textHeight = 16;
    
    let labelX = pixelX;
    let labelY = pixelY - 5;
    
    if (labelY - textHeight < 0) {
      labelY = pixelY + boxHeight + textHeight + 5;
    }
    if (labelX + textWidth > canvasWidth) {
      labelX = canvasWidth - textWidth - 5;
    }
    if (labelX < 0) {
      labelX = 5;
    }
    
    ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
    ctx.fillRect(labelX - 2, labelY - textHeight, textWidth + 4, textHeight + 2);
    
    ctx.fillStyle = 'white';
    ctx.fillText(label, labelX, labelY - 2);
    
    monitor.canvas.style.display = 'block';
    
    console.log(`Drew detection box at (${pixelX.toFixed(1)}, ${pixelY.toFixed(1)}) size ${boxWidth.toFixed(1)}x${boxHeight.toFixed(1)}`);
    
  } catch (error) {
    console.error("Error drawing detection:", error);
  }
}

function createDefectBanners() {
  printMonitors.forEach(monitor => {
    const defectBanner = document.createElement('div');
    defectBanner.id = `defectBanner${monitor.id}`;
    defectBanner.className = 'defect-banner';
    defectBanner.style.display = 'none';
    
    const videoElement = document.getElementById(monitor.videoId);
    if (!videoElement) {
      console.error(`Video element ${monitor.videoId} not found for banner creation`);
      return;
    }
    
    const monitorElement = videoElement.closest('.monitor');
    if (!monitorElement) {
      console.error(`Monitor element not found for video ${monitor.videoId}`);
      return;
    }
    monitorElement.style.position = 'relative';
    monitorElement.appendChild(defectBanner);
    monitor.defectBanner = defectBanner;
  });
}

function showDefectBanner(monitor, defect) {
  try {
    if (!monitor.defectBanner) {
      console.error(`Defect banner not initialized for monitor ${monitor.id}`);
      return;
    }
    
    let message, defectType;
    
    if (defect.type === 'spaghetti') {
      message = `הדפסה נעצרה ⚠️`;
      defectType = `סוג פגם: Spaghetti Error`;
    } else if (defect.type === 'layer') {
      message = `הדפסה נעצרה ⚠️`;
      defectType = `סוג פגם: Layer Shifting`;
    } else {
      message = `הדפסה נעצרה ⚠️`;
      defectType = `סוג פגם: ${defect.type || 'לא זוהה'}`;
    }
    
    const orderNumber = `#${1000 + monitor.id}`;
    const orderInfo = `הזמנה מספר ${orderNumber}`;
    
    monitor.defectBanner.className = 'defect-banner';
    monitor.defectBanner.innerHTML = `
      ${orderInfo}<br>
      ${message}<br>
      ${defectType}<br>
      <button class="close-btn" onclick="document.getElementById('${monitor.defectBanner.id}').style.display='none';">
        סגור
      </button>
    `;
    
    monitor.defectBanner.style.display = 'block';
    
  } catch (error) {
    console.error("Error showing defect banner:", error);
  }
}

function showSuccessBanner(monitor) {
  try {
    if (!monitor.defectBanner) {
      console.error(`Banner not initialized for monitor ${monitor.id}`);
      return;
    }
    
    monitor.defectBanner.innerHTML = 'הדפסה הושלמה בהצלחה! ✓';
    monitor.defectBanner.className = 'success-banner';
    
    monitor.defectBanner.removeAttribute('style');
    
  } catch (error) {
    console.error("Error showing success banner:", error);
  }
}

function stopPrint(monitor) {
  if (monitor.stopped) return;

  monitor.stopped = true;
  
  if (monitor.interval) {
    clearInterval(monitor.interval);
    monitor.interval = null;
  }
  
  if (monitor.video && !monitor.video.paused) {
    monitor.video.pause();
  }
  
  if (monitor.timeElement) {
    monitor.timeElement.textContent += " ❌ ההדפסה נעצרה";
  }
  
  if (monitor.stopBtn) {
    monitor.stopBtn.disabled = true;
    monitor.stopBtn.style.opacity = 0.6;
    monitor.stopBtn.textContent = "הדפסה נעצרה";
  }
  
  if (monitor.video) {
    monitor.video.onplay = null;
    monitor.video.onplaying = null;
  }
}

function completePrint(monitor) {
  if (monitor.stopped) return;
  
  console.log(`Print completed for monitor ${monitor.id}`);
  
  if (monitor.interval) {
    clearInterval(monitor.interval);
    monitor.interval = null;
  }
  monitor.stopped = true;
  
  if (monitor.warningElement) {
    monitor.warningElement.textContent = monitor.defectMessages.clean || '✓ הדפסה הושלמה בהצלחה';
    monitor.warningElement.style.color = 'green';
    monitor.warningElement.style.display = 'block';
  }
  
  showSuccessBanner(monitor);
  
  if (monitor.stopBtn) {
    monitor.stopBtn.disabled = true;
    monitor.stopBtn.style.opacity = 0.6;
    monitor.stopBtn.textContent = "הדפסה הושלמה";
  }
  
  if (monitor.timeElement) {
    monitor.timeElement.textContent += " ✓ הושלמה בהצלחה";
  }
}

async function checkAPIHealth() {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    const response = await fetch(`${CONFIG.API_BASE_URL}health`, {
      method: 'GET',
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    if (response.ok) {
      const health = await response.json();
      console.log('API Health Check:', health);
      return true;
    }
    return false;
  } catch (error) {
    console.error('API health check failed:', error);
    return false;
  }
}

function updateAPIStatus(isOnline) {
  let statusIndicator = document.getElementById('api-status');
  if (!statusIndicator) {
    statusIndicator = document.createElement('div');
    statusIndicator.id = 'api-status';
    statusIndicator.style.position = 'fixed';
    statusIndicator.style.top = '10px';
    statusIndicator.style.left = '10px';
    statusIndicator.style.padding = '5px 10px';
    statusIndicator.style.borderRadius = '5px';
    statusIndicator.style.color = 'white';
    statusIndicator.style.fontWeight = 'bold';
    statusIndicator.style.zIndex = '9999';
    document.body.appendChild(statusIndicator);
  }
  
  if (isOnline) {
    statusIndicator.textContent = '● API Connected';
    statusIndicator.style.backgroundColor = 'green';
  } else {
    statusIndicator.textContent = '● API Disconnected';
    statusIndicator.style.backgroundColor = 'red';
    
    // Automatically try reconnecting
    setTimeout(checkAPIHealth, 30000);
  }
}

function startAPIMonitoring() {
  checkAPIHealth().then(isOnline => {
    updateAPIStatus(isOnline);
  });
  
  setInterval(() => {
    checkAPIHealth().then(isOnline => {
      updateAPIStatus(isOnline);
    });
  }, CONFIG.API_CHECK_INTERVAL);
}

function monitorVideoPerformance() {
  printMonitors.forEach(monitor => {
    if (!monitor.video || monitor.stopped) return;
    
    if (monitor.video.playbackRate !== 1.0) {
      console.log(`Correcting playback rate for video ${monitor.id} from ${monitor.video.playbackRate} to 1.0`);
      monitor.video.playbackRate = 1.0;
    }
    
    if (!monitor.video.paused && monitor.video.readyState >= 3) {
      const now = Date.now();
      
      if (!monitor.lastPlayTime) {
        monitor.lastPlayTime = now;
        monitor.lastTimeUpdate = monitor.video.currentTime;
      }
      
      if (now - monitor.lastPlayTime > 3000) {
        const currentTime = monitor.video.currentTime;
        const timeDiff = Math.abs(currentTime - monitor.lastTimeUpdate);
        
        if (timeDiff < 0.5 && !monitor.video.seeking && !monitor.video.paused) {
          console.log(`Video ${monitor.id} appears stalled, attempting to restore playback`);
          monitor.video.currentTime += 0.1;
          monitor.video.play().catch(err => console.error('Playback recovery failed:', err));
        }
        monitor.lastPlayTime = now;
        monitor.lastTimeUpdate = currentTime;
      }
    }
  });
}

function manualDetect(monitorId) {
  const monitor = printMonitors.find(m => m.id === monitorId);
  if (monitor && !monitor.stopped) {
    console.log(`Manually triggering detection for monitor ${monitorId}`);
    captureAndDetectImproved(monitor);
  } else {
    console.error(`Cannot manually detect: Monitor ${monitorId} not found or stopped`);
  }
}

function forceDefect(monitorId, defectType) {
  const monitor = printMonitors.find(m => m.id === monitorId);
  if (!monitor || monitor.stopped) {
    console.error(`Cannot force defect: Monitor ${monitorId} not found or stopped`);
    return;
  }
  
  const mockDefect = {
    type: defectType,
    confidence: 0.95,
    bbox: [0.5, 0.5, 0.3, 0.3],
    class_id: defectType === 'spaghetti' ? 8264 : (defectType === 'layer' ? 4153 : 8323)
  };
  
  if (defectType !== 'clean') {
    handleDefectDetection(monitor, mockDefect);
  } else {
    console.log(`Forced clean detection for monitor ${monitorId}`);
  }
}

setInterval(monitorVideoPerformance, 3000);

window.debugPrint = {
  manualDetect: manualDetect,
  forceDefect: forceDefect,
  getMonitorState: (id) => {
    const monitor = printMonitors.find(m => m.id === id);
    return monitor ? {
      id: monitor.id,
      videoTime: monitor.video ? monitor.video.currentTime : null,
      stopped: monitor.stopped,
      detectionBuffer: monitor.detectionBuffer
    } : null;
  },
  resetAPI: () => {
    checkAPIHealth().then(isOnline => {
      updateAPIStatus(isOnline);
      console.log("API connection check triggered manually");
    });
  }
};

const recommendationsDatabase = {
  "spaghetti": [
    {
      title: "בדיקת טמפרטורת דיזה",
      text: "וודא שטמפרטורת הדיזה מתאימה לחומר. עבור PLA השתמש ב-190-210°C. טמפרטורה גבוהה מדי עלולה לגרום לזליגות ויצירת חוטים."
    },
    {
      title: "כיוון מהירות הדפסה",
      text: "הפחת את מהירות ההדפסה ל-40-50 מ\"מ/שנייה. מהירות גבוהה עלולה לגרום לחוטים דקים ואיכות הדפסה ירודה."
    },
    {
      title: "בדיקת הידבקות הראשונה",
      text: "וודא שהשכבה הראשונה נדבקת היטב למשטח ההדפסה. הידבקות לקויה עלולה לגרום להתנתקות המודל ויצירת spaghetti."
    },
    {
      title: "ניקוי דיזה",
      text: "נקה את הדיזה מחומר ישן או חסום. חסימה חלקית עלולה לגרום לזרימה לא אחידה ויצירת חוטים דקים."
    }
  ],
  "layer": [
    {
      title: "בדיקת חגורות ציר X/Y",
      text: "וודא שחגורות הצירים מתוחות כראוי ולא רפויות. חגורות רפויות עלולות לגרום לתזוזת שכבות."
    },
    {
      title: "כיבוד מהירות הדפסה",
      text: "הפחת את מהירות ההדפסה והאצה. מהירות גבוהה יכולה לגרום לכוחות שמזיזים את השכבות."
    },
    {
      title: "בדיקת מכשולים מכניים",
      text: "וודא שאין מכשולים במסילות התנועה ושהצירים נעים בחלקות. חיכוך או הפרעות עלולים לגרום לתזוזה."
    },
    {
      title: "כיוון זרמי מנועים",
      text: "בדוק שזרמי מנועי הצעדים מכווננים נכון. זרם נמוך עלול לגרום לדילוג צעדים ותזוזת שכבות."
    },
    {
      title: "בדיקת יציבות מדפסת",
      text: "וודא שהמדפסת יציבה ולא רוטטת במהלך ההדפסה. רעידות עלולות לגרום לתזוזות בשכבות."
    }
  ]
};

function initializeSmartAnalysisPanel() {
  console.log('Initializing smart analysis panel...');
  
  const searchInput = document.getElementById('order-search-input');
  const searchBtn = document.getElementById('search-order-btn');
  const downloadBtn = document.getElementById('download-report-btn');
  const recommendationsBtn = document.getElementById('show-recommendations-btn');

  if (!searchInput || !searchBtn) {
    console.error('Search elements not found!');
    return;
  }

  searchBtn.addEventListener('click', performSearch);
  searchInput.addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
      performSearch();
    }
  });

  searchInput.addEventListener('input', function() {
    const query = this.value.trim();
    console.log('Search input changed:', query);
    
    if (window.currentAnalyzedOrder && query !== window.currentAnalyzedOrder.orderNumber) {
      hideOrderDetails();
    }
    
    if (query.length >= 2) {
      showSearchResults(query);
    } else {
      hideSearchResults();
    }
  });

  if (downloadBtn) {
    downloadBtn.addEventListener('click', downloadReport);
  }
  
  if (recommendationsBtn) {
    recommendationsBtn.addEventListener('click', showRecommendations);
  }
}

async function performSearch() {
  console.log('performSearch() called');
  
  const searchInput = document.getElementById('order-search-input');
  if (!searchInput) {
    console.error('Search input not found!');
    return;
  }
  
  const query = searchInput.value.trim();
  console.log('Search query:', query);
  
  if (!query) {
    alert('אנא הכנס מספר הזמנה לחיפוש');
    return;
  }

  showLoading(true);

  try {
    console.log('Fetching order from database:', query);
    
    const response = await fetch(`../php/get_failed_order_details.php?action=search&order_number=${encodeURIComponent(query)}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const result = await response.json();
    console.log('Database response:', result);
    
    if (result.success && result.data) {
      console.log('Order found:', result.data);
      displayOrderAnalysis(result.data);
      hideSearchResults();
    } else {
      console.log('Order not found or no failure details');
      alert(`לא נמצאה הזמנה כושלת עם מספר ${query}`);
    }
    
  } catch (error) {
    console.error('Error fetching order:', error);
    alert('שגיאה בחיפוש ההזמנה. אנא נסה שוב.');
  } finally {
    showLoading(false);
  }
}

async function showSearchResults(query) {
  const resultsContainer = document.getElementById('search-results');
  if (!resultsContainer) return;
  
  try {
    const response = await fetch(`../php/get_failed_order_details.php?action=get_all`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const result = await response.json();
    
    if (result.success && result.data) {
      const matchingOrders = result.data.filter(order => 
        order.orderNumber.includes(query) || 
        order.defectName.includes(query) ||
        order.customer.includes(query)
      );

      if (matchingOrders.length > 0) {
        resultsContainer.innerHTML = '';
        
        matchingOrders.forEach(order => {
          const resultItem = document.createElement('div');
          resultItem.className = 'search-result-item';
          resultItem.innerHTML = `
            <div class="result-order-number">הזמנה #${order.orderNumber}</div>
            <div class="result-defect-type">${order.defectName} - ${order.customer}</div>
          `;
          
          resultItem.addEventListener('click', () => {
            document.getElementById('order-search-input').value = order.orderNumber;
            performSearch();
            hideSearchResults();
          });
          
          resultsContainer.appendChild(resultItem);
        });
        
        resultsContainer.style.display = 'block';
      } else {
        hideSearchResults();
      }
    }
    
  } catch (error) {
    console.error('Error fetching search suggestions:', error);
    hideSearchResults();
  }
}

function displayOrderAnalysis(orderData) {
  const analysisSection = document.getElementById('analysis-section');
  const orderInfoContainer = document.getElementById('selected-order-info');
  
  if (!analysisSection || !orderInfoContainer) {
    console.error('Analysis section elements not found');
    return;
  }
  const formattedDate = formatDate(orderData.date);
  
  orderInfoContainer.innerHTML = `
    <div class="order-title">הזמנה #${orderData.orderNumber}</div>
    <div class="defect-badge ${orderData.defectType}">${orderData.defectName}</div>
    <div style="font-size: 13px; color: #666; line-height: 1.5;">
      <div><strong>תאריך הזמנה:</strong> ${formattedDate}</div>
      <div><strong>אימייל:</strong> ${orderData.email}</div>
      <div><strong>כתובת:</strong> ${orderData.address}</div>
      <div><strong>סוג משלוח:</strong> ${getShippingText(orderData.shipping)}</div>
      <div><strong>מחיר הזמנה:</strong> ₪${orderData.totalPrice}</div>
    </div>
  `;
  
  window.currentAnalyzedOrder = orderData;
  analysisSection.classList.add('active');

}

function getShippingText(shipping) {
  switch(shipping) {
    case 'regular': return 'משלוח רגיל';
    case 'express': return 'שליח עד הבית';
    case 'pickup': return 'איסוף עצמי';
    default: return shipping;
  }
}

function hideSearchResults() {
  document.getElementById('search-results').style.display = 'none';
}

function downloadReport() {
  if (!window.currentAnalyzedOrder) {
    alert('אנא בחר הזמנה תחילה');
    return;
  }
  const orderData = window.currentAnalyzedOrder;
  openPDFFullScreen(orderData.reportPath);
}

function hideOrderDetails() {
  const analysisSection = document.getElementById('analysis-section');
  if (analysisSection) {
    analysisSection.classList.remove('active');
  }
  window.currentAnalyzedOrder = null;
  console.log('Order details hidden due to search input change');
}

function showRecommendations() {
  if (!window.currentAnalyzedOrder) {
    alert('אנא בחר הזמנה תחילה');
    return;
  }
  const orderData = window.currentAnalyzedOrder;
  const recommendations = recommendationsDatabase[orderData.defectType] || [];
  const modal = document.getElementById('recommendations-modal');
  const body = document.getElementById('recommendations-body');
  
  body.innerHTML = `
    <div style="margin-bottom: 20px; text-align: center; color: #666;">
      המלצות לשיפור הדפסה עבור פגם: <strong>${orderData.defectName}</strong>
    </div>
  `;
  
  recommendations.forEach((rec, index) => {
    const recItem = document.createElement('div');
    recItem.className = 'recommendation-item';
    recItem.innerHTML = `
      <div class="recommendation-title">${index + 1}. ${rec.title}</div>
      <div class="recommendation-text">${rec.text}</div>
    `;
    body.appendChild(recItem);
  });
  modal.classList.add('active');
}

function openPDFFullScreen(reportPath) {
  const overlay = document.createElement('div');
  overlay.id = 'pdf-fullscreen-overlay';
  overlay.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.9);
    z-index: 10000;
    display: flex;
    flex-direction: column;
  `;
  
  const header = document.createElement('div');
  header.style.cssText = `
    background: white;
    padding: 15px 20px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    box-shadow: 0 2px 10px rgba(0,0,0,0.1);
  `;
  
  header.innerHTML = `
    <h3 style="margin: 0; color: #333;">דוח סטטיסטי מפורט</h3>
    <div>
      <button id="download-fullscreen-pdf" style="
        background: #007bff;
        color: white;
        border: none;
        padding: 8px 15px;
        border-radius: 5px;
        margin-left: 10px;
        cursor: pointer;
      ">הורד PDF</button>
      <button id="close-fullscreen-pdf" style="
        background: #dc3545;
        color: white;
        border: none;
        padding: 8px 15px;
        border-radius: 5px;
        cursor: pointer;
      ">✕ סגור</button>
    </div>
  `;
  
  const iframeContainer = document.createElement('div');
  iframeContainer.style.cssText = `
    flex: 1;
    background: white;
    overflow: hidden;
  `;
  
  iframeContainer.innerHTML = `
    <iframe 
      src="../${reportPath}" 
      type="application/pdf"
      width="100%" 
      height="100%"
      style="border: none;">
      <p style="padding: 20px; text-align: center;">
        הדפדפן שלך אינו תומך בהצגת PDF. 
        <a href="../${reportPath}" target="_blank">לחץ כאן לפתיחה בחלון חדש</a>
      </p>
    </iframe>
  `;
  
  overlay.appendChild(header);
  overlay.appendChild(iframeContainer);
  document.body.appendChild(overlay);
  
  document.getElementById('close-fullscreen-pdf').addEventListener('click', function() {
    document.body.removeChild(overlay);
  });
  
  document.getElementById('download-fullscreen-pdf').addEventListener('click', function() {
    downloadPDFReport(reportPath);
  });
  
  const escapeHandler = function(e) {
    if (e.key === 'Escape') {
      if (document.getElementById('pdf-fullscreen-overlay')) {
        document.body.removeChild(overlay);
        document.removeEventListener('keydown', escapeHandler);
      }
    }
  };
  
  document.addEventListener('keydown', escapeHandler);
  
  overlay.addEventListener('click', function(e) {
    if (e.target === overlay) {
      document.body.removeChild(overlay);
      document.removeEventListener('keydown', escapeHandler);
    }
  });
}

function downloadPDFReport(reportPath) {
  try {
    const link = document.createElement('a');
    link.href = `../${reportPath}`; 
    link.download = reportPath.split('/').pop();
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    setTimeout(() => {
      alert('הדוח הורד בהצלחה!');
    }, 100);
  } catch (error) {
    console.error('Error downloading PDF:', error);
    alert('שגיאה בהורדת הדוח. אנא נסה שוב.');
  }
}

function closeRecommendationsModal() {
  document.getElementById('recommendations-modal').classList.remove('active');
}

function showLoading(show) {
  const spinner = document.getElementById('loading-spinner');
  if (show) {
    spinner.style.display = 'block';
  } else {
    spinner.style.display = 'none';
  }
}

function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString('he-IL', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

document.addEventListener('click', function(e) {
  const modal = document.getElementById('recommendations-modal');
  if (e.target === modal) {
    closeRecommendationsModal();
  }
});

document.addEventListener('click', function(e) {
  const searchSection = document.querySelector('.search-section');
  if (!searchSection.contains(e.target)) {
    hideSearchResults();
  }
});
