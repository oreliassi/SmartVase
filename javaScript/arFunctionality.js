let shouldAnimate = false
let threeScene, threeCamera, threeRenderer;
let threeContainer, threePot;
let isThreeInitialized = false;
let originalModelScale = null;
let originalModelPosition = null;
let currentZoom = 1;
const minZoom = 0.5;
const maxZoom = 3;
const zoomStep = 0.1;

function closeARSubmenu() {
    $('.ar-submenu').removeClass('expanded');
    $('.ar-overlay').removeClass('active');
    $('.ar-submenu').css('display', 'none');
    $('.ar-overlay').css('display', 'none');
}

function showARSubmenu() {
    $('.ar-submenu').addClass('expanded');
    $('.ar-overlay').addClass('active');
    
    $('.ar-submenu').css('display', 'block');
    $('.ar-overlay').css('display', 'block');
}

function closeAR() {
    console.log("Closing AR view and resetting all states");
    $('#ar-container').hide();
    
    const video = document.getElementById('ar-video');
    if (video && video.srcObject) {
        const tracks = video.srcObject.getTracks();
        tracks.forEach(function(track) {
            track.stop();
        });
        video.srcObject = null;
    }
    
    const canvas = document.getElementById('ar-canvas');
    if (canvas) {
        canvas.removeAttribute('data-captured');
        const ctx = canvas.getContext('2d');
        if (ctx) {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
        }
    }
    $('.ar-controls-alt').remove();
    $('.ar-controls').show();
    $('#take-photo').css('display', 'block');
    $('#retake-photo').css('display', 'none');
    $('#save-ar-image').css('display', 'none');
    $('.flash-effect').remove();
    $('.save-notification').remove();
    window.saveInProgress = false;
    console.log("AR view closed and all states reset");
}

function setupARButtons() {
    $('#take-photo').css('display', 'block');
    $('#retake-photo').css('display', 'none');
    $('#save-ar-image').css('display', 'none');
    if (!$('#show-in-room').length) {
        console.log('יצירת כפתור AR ראשי');
        const showInRoomBtn = $('<button id="show-in-room">הצג בסביבה שלך</button>');
        const arOverlay = $('<div class="ar-overlay"></div>');
        const arSubmenu = $(`
            <div class="ar-submenu">
                <h3>בחר אפשרות הצגה</h3>
                <button class="close-ar-btn" aria-label="סגור">✕</button>
                
                <button id="ar-camera" class="ar-btn">
                    <i class="ar-icon camera-icon"></i>
                    השתמש במצלמה
                </button>
                <button id="ar-upload" class="ar-btn">
                    <i class="ar-icon gallery-icon"></i>
                    העלה תמונה מהגלריה
                </button>
                <div class="esc-hint">לחץ ESC ליציאה</div>
            </div>
        `);
        
        const imageUpload = $('<input type="file" id="image-upload" accept="image/*" >');
        $('#add-to-cart').before(showInRoomBtn);
        $('body').append(arOverlay, arSubmenu, imageUpload);
    }
    
    if (!$('#ar-container').length) {
        console.log('יצירת קונטיינר AR');
        
const arContainer = $(`
            <div id="ar-container">
                <div class="ar-viewer-overlay">
                    <div id="close-ar">✖</div>
                    <div id="ar-canvas-container"></div>
                    <div class="ar-controls">
                        <button id="take-photo">צלם תמונה</button>
                        <button id="retake-photo" >צלם שוב</button>
                        <button id="save-ar-image" >שמור תמונה</button>
                    </div>
                    <div class="esc-hint">לחץ ESC ליציאה</div>
                </div>
            </div>
        `);
        
        $('body').append(arContainer);
    }
}

function startARWithCamera() {
    $('#ar-container').show();
    
    const arContainer = `
        <video id="ar-video" autoplay playsinline></video>
        <div id="ar-pot-container"></div>
        <div id="ar-instructions">גרור את הכד למיקום הרצוי</div>
        <canvas id="ar-canvas" ></canvas>
    `;
    
    $('#ar-canvas-container').html(arContainer);
    
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
            .then(function(stream) {
                const video = document.getElementById('ar-video');
                video.srcObject = stream;
                
                video.onloadeddata = function() {
                    setTimeout(function() {
                        addPotToAREnvironment();
                    }, 100);
                };
            })
            .catch(function(error) {
                console.error("שגיאה בגישה למצלמה:", error);
                $('#ar-canvas-container').html('<div class="camera-permission-error">' +
                                             '<h3>לא ניתן לגשת למצלמה</h3>' +
                                             '<p>אנא אשר גישה למצלמה או השתמש באפשרות "העלה תמונה מהגלריה"</p>' +
                                             '</div>');
            });
    } else {
        $('#ar-canvas-container').html('<div class="camera-permission-error">' +
                                     '<h3>הדפדפן שלך אינו תומך בגישה למצלמה</h3>' +
                                     '<p>נסה להשתמש בדפדפן עדכני יותר או באפשרות "העלה תמונה מהגלריה"</p>' +
                                     '</div>');
    }
}

function startARWithImage(imageURL) {
    $('#ar-container').show();

    const arContainer = `
       <div id="ar-image-container" >
            <img id="ar-image" src="${imageURL}" >
        
        <div id="ar-pot-container"></div>
        <div id="ar-instructions" >גרור את הכד למיקום הרצוי</div>
        <canvas id="ar-canvas" ></canvas>
    `;

    $('#ar-canvas-container').html(arContainer);
    
    setupARControls();

    $('#ar-image').on('load', function () {
        setTimeout(function () {
            addPotToAREnvironment();
        }, 500);
    });

    setTimeout(function () {
        $('#ar-instructions').fadeOut();
    }, 5000);
}

function addPotToAREnvironment() {
  showLoadingSpinner();
  
  if ($('#ar-pot-container').length === 0) {
    $('#ar-canvas-container').append('<div id="ar-pot-container"></div>');
  }
  const potContainer = $('#ar-pot-container');
  potContainer.empty();
  const currentColor = $('.color-box.selected').data('color') || '#f14a4a';
  const currentModel = currentModelPath || 'models/vase1.stl';
  const r = parseInt(currentColor.slice(1, 3), 16) / 255;
  const g = parseInt(currentColor.slice(3, 5), 16) / 255;
  const b = parseInt(currentColor.slice(5, 7), 16) / 255;
  console.log('יוצר מודל תלת מימדי בצבע:', currentColor, 'ערכי RGB:', r, g, b);
  const threeContainerElement = $('<div>', {
    id: 'three-container',
    css: {
      position: 'absolute',
      width: '100%',
      height: '100%',
      left: '0',
      top: '0',
      zIndex: 1000
    }
  });
  potContainer.append(threeContainerElement);
    initThreeJS(currentModel, currentColor);
}

function colorARPotElement(element, color) {
    const r = parseInt(color.slice(1, 3), 16);
    const g = parseInt(color.slice(3, 5), 16);
    const b = parseInt(color.slice(5, 7), 16);
    console.log('צביעת כד בצבע:', color, 'ערכי RGB:', r, g, b);
    let filterValue = '';
    
    if (r > 200 && g < 100 && b < 100) {
        filterValue = 'brightness(0) saturate(100%) invert(27%) sepia(90%) ' + 
                  'saturate(2000%) hue-rotate(355deg) brightness(1.1) contrast(0.9)';
    } else if (r < 100 && g > 200 && b < 100) {
        filterValue = 'brightness(0) saturate(100%) invert(68%) sepia(74%) ' + 
                  'saturate(401%) hue-rotate(81deg) brightness(0.92) contrast(0.96)';
    } else if (r < 100 && g < 100 && b > 200) {
        filterValue = 'brightness(0) saturate(100%) invert(43%) sepia(98%) ' + 
                  'saturate(1000%) hue-rotate(212deg) brightness(0.9) contrast(0.85)';
    } else if (r > 200 && g > 200 && b < 100) {
        filterValue = 'brightness(0) saturate(100%) invert(96%) sepia(40%) ' + 
                  'saturate(1217%) hue-rotate(339deg) brightness(1.1) contrast(0.95)';
    } else if (r > 200 && g < 100 && b > 200) {
        filterValue = 'brightness(0) saturate(100%) invert(32%) sepia(95%) ' + 
                  'saturate(7471%) hue-rotate(285deg) brightness(0.85) contrast(0.9)';
    } else {
        const maxVal = Math.max(r, g, b);
        const minVal = Math.min(r, g, b);
        const delta = maxVal - minVal;
        
        let hue = 0;
        if (delta !== 0) {
            if (maxVal === r) {
                hue = ((g - b) / delta) % 6;
            } else if (maxVal === g) {
                hue = (b - r) / delta + 2;
            } else {
                hue = (r - g) / delta + 4;
            }
            hue = Math.round(hue * 60);
            if (hue < 0) hue += 360;
        }
        
        const lightness = (maxVal + minVal) / (2 * 255);
        const saturation = delta === 0 ? 0 : delta / (1 - Math.abs(2 * lightness - 1)) / 255;
        
        filterValue = 'brightness(0) saturate(100%) invert(' + Math.round(lightness * 100) + '%) ' + 
                      'sepia(' + Math.round(saturation * 85) + '%) saturate(' + Math.round(saturation * 1000) + '%) ' + 
                      'hue-rotate(' + hue + 'deg) brightness(' + (lightness + 0.4) + ') contrast(' + (0.75 + saturation * 0.25) + ')';
    }
    element.css({
        'filter': filterValue
    });
    
    console.log('פילטר שהוחל:', filterValue);
}

function getHueRotation(r, g, b) {
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h = 0;
    
    if (max === min) {
        h = 0;
    } else if (max === r) {
        h = 60 * ((g - b) / (max - min)) + (g < b ? 360 : 0);
    } else if (max === g) {
        h = 60 * ((b - r) / (max - min)) + 120;
    } else {
        h = 60 * ((r - g) / (max - min)) + 240;
    }
    
    return h;
}

function getBrightness(r, g, b) {
    return ((r * 299 + g * 587 + b * 114) / 1000) / 255 * 1.5;
}

function getContrast(r, g, b) {
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return luminance > 0.5 ? 0.8 : 1.2;
}

function makeARPotDraggable(element) {
    element.off();
    $(document).off('.arDrag');
    
    let isDragging = false;
    let startX, startY;
    let startPosition = { x: 0, y: 0 };
    
    element.on('mousedown touchstart', function(e) {
        if (!isThreeInitialized || !threePot) return;
        
        if ($(e.target).hasClass('zoom-btn') || $(e.target).closest('.zoom-controls').length) {
            return;
        }
        e.preventDefault();
        e.stopPropagation();
        isDragging = true;
        if (e.type === 'touchstart') {
            startX = e.originalEvent.touches[0].clientX;
            startY = e.originalEvent.touches[0].clientY;
        } else {
            startX = e.clientX;
            startY = e.clientY;
        }
        
        startPosition = {
            x: threePot.position.x,
            y: threePot.position.y
        };
        
        threePot.material.opacity = 0.8;
        threePot.material.transparent = true;
    });
    
    $(document).on('mousemove.arDrag touchmove.arDrag', function(e) {
        if (!isDragging || !isThreeInitialized || !threePot) return;
        
        e.preventDefault();
        
        let currentX, currentY;
        if (e.type === 'touchmove') {
            currentX = e.originalEvent.touches[0].clientX;
            currentY = e.originalEvent.touches[0].clientY;
        } else {
            currentX = e.clientX;
            currentY = e.clientY;
        }
        
        const deltaX = currentX - startX;
        const deltaY = currentY - startY;
        const screenWidth = threeContainer.clientWidth;
        const screenHeight = threeContainer.clientHeight;
        const moveFactor = 5;
        const moveX = (deltaX / screenWidth) * moveFactor;
        const moveY = -(deltaY / screenHeight) * moveFactor;
        
        threePot.position.x = startPosition.x + moveX;
        threePot.position.y = startPosition.y + moveY;
    });
    
    $(document).on('mouseup.arDrag touchend.arDrag', function() {
        if (isDragging && isThreeInitialized && threePot) {
            isDragging = false;
            
            if (threePot.material.transparent) {
                threePot.material.opacity = 1.0;
            }
        }
    });
}

function setupARControls() {
    $('#take-photo').css('display', 'block');
    $('#retake-photo').css('display', 'none');
    $('#save-ar-image').css('display', 'none');
    console.log("AR controls initialized - only 'take-photo' is visible");
}

function captureARPhoto() {
    console.log("התחלת תהליך צילום");
    const video = document.getElementById('ar-video');
    const arImage = document.getElementById('ar-image');
    const canvas = document.getElementById('ar-canvas');
    if (!canvas) {
        console.error("אלמנט הקנבס לא נמצא!");
        alert("שגיאה בצילום – הקנבס לא נמצא");
        return;
    }
    const ctx = canvas.getContext('2d');
    if (!ctx) {
        console.error("נכשל בקבלת הקשר קנבס!");
        alert("שגיאה בצילום – לא ניתן לקבל הקשר גרפי");
        return;
    }
    if ((!video && !arImage)) {
        console.error("חסרים אלמנטים חיוניים לצילום", {
            video: !!video,
            arImage: !!arImage
        });
        alert("שגיאה בצילום – אחד האלמנטים לא נמצא");
        return;
    }
    $('#take-photo').css('display', 'none');
    $('#retake-photo').css('display', 'block');
    $('#save-ar-image').css('display', 'block');
    console.log("מצב כפתורים שונה - take-photo: מוסתר, retake-photo: מוצג, save-ar-image: מוצג");
    const flashElement = document.createElement('div');
    flashElement.className = 'flash-effect';
    document.getElementById('ar-container').appendChild(flashElement);
    
    setTimeout(() => {
        flashElement.style.opacity = '0';
        setTimeout(() => flashElement.remove(), 500);
    }, 50);

    shouldAnimate = false;
    disableDragging();
    console.log("גרירה מבוטלת");
    const sourceElement = video && video.srcObject ? video : arImage;
    
    if (!sourceElement) {
        console.error("לא נמצא אלמנט מקור (וידאו או תמונה)");
        alert("שגיאה בצילום – מקור התמונה לא נמצא");
        return;
    }

    console.log("משתמש באלמנט מקור:", sourceElement.tagName);
    const containerWidth = sourceElement.offsetWidth || sourceElement.clientWidth;
    const containerHeight = sourceElement.offsetHeight || sourceElement.clientHeight;
    const sourceWidth = sourceElement.videoWidth || sourceElement.naturalWidth || containerWidth;
    const sourceHeight = sourceElement.videoHeight || sourceElement.naturalHeight || containerHeight;
    
    canvas.width = sourceWidth;
    canvas.height = sourceHeight;
    
    console.log("ממדי קנבס הוגדרו:", { width: canvas.width, height: canvas.height });
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    try {
        ctx.drawImage(sourceElement, 0, 0, canvas.width, canvas.height);
        console.log("הרקע צויר על הקנבס");
        
        if (video && video.srcObject) {
            $(video).css('display', 'none');
            video.setAttribute('data-paused', 'true');
            video.pause();
            console.log("וידאו המצלמה הוקפא ומוסתר");
        }
        
        if (arImage) {
            $(arImage).css('display', 'none');
            console.log("תמונת הרקע המקורית הוסתרה");
        }
        
        $(canvas).css('display', 'block');
    } catch (e) {
        console.error("שגיאה בציור הרקע על הקנבס:", e);
        alert("שגיאה בצילום – לא ניתן לצייר את הרקע");
        return;
    }

    if (isThreeInitialized && threeRenderer) {
        console.log("לוכד את המודל התלת מימדי");
        
        try {
            threeRenderer.render(threeScene, threeCamera);
            const threeImage = threeRenderer.domElement.toDataURL('image/png');
            const threeImageObj = new Image();
            threeImageObj.onload = function() {
                ctx.drawImage(threeImageObj, 0, 0, canvas.width, canvas.height);
                canvas.setAttribute('data-captured', 'true');
                console.log("צילום המודל התלת מימדי הושלם בהצלחה");
                $('#take-photo').css('display', 'none');
                $('#retake-photo').css('display', 'block');
                $('#save-ar-image').css('display', 'block');
                showAlternativeButtons();
            };
            
            threeImageObj.onerror = function(e) {
                console.error("שגיאה בטעינת תמונת המודל התלת מימדי:", e);
                alert("שגיאה בצילום המודל, אבל הרקע נשמר");
                canvas.setAttribute('data-captured', 'true');
                showAlternativeButtons();
            };
            
            threeImageObj.src = threeImage;
        } catch (e) {
            console.error("שגיאה בלכידת המודל התלת מימדי:", e);
            alert("שגיאה בצילום המודל, ממשיך עם הרקע בלבד");
            canvas.setAttribute('data-captured', 'true');
            showAlternativeButtons();
        }
    } else {
        console.warn("המודל התלת מימדי לא מאותחל, ממשיך עם הרקע בלבד");
        canvas.setAttribute('data-captured', 'true');
        showAlternativeButtons();
    }
}

function showAlternativeButtons() {
if ($('.ar-controls-alt').length) return;
  $('.ar-controls').hide();
  const newControls = $('<div class="ar-controls-alt" ></div>');
  const retakeBtn = $('<button id="ar-btn">צלם שוב</button>');
  const saveBtn = $('<button id="ar-btn">שמור תמונה</button>');
  retakeBtn.on('click', function() {
      retakePhoto();
  });
  
  saveBtn.on('click', function() {
    saveARImage();
  });
  newControls.append(retakeBtn, saveBtn);
    $('.ar-viewer-overlay').append(newControls);
}

function retakePhoto() {
    console.log("Retaking photo");
    $('.ar-controls-alt').remove();
    $('.ar-controls').show();
    $('#retake-photo').css('display', 'none');
    $('#save-ar-image').css('display', 'none');
    $('#take-photo').css('display', 'block');
    
    const canvas = document.getElementById('ar-canvas');
    if (canvas) {
        canvas.removeAttribute('data-captured');
        const ctx = canvas.getContext('2d');
        if (ctx) {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
        }
        $(canvas).css('display', 'none');
    }
    
    enableDragging();
    shouldAnimate = false;
    console.log("Dragging re-enabled");
    const video = document.getElementById('ar-video');
    if (video && video.srcObject) {
        if (video.hasAttribute('data-paused')) {
            video.removeAttribute('data-paused');
            video.play();
            console.log("וידאו המצלמה הופעל מחדש");
        }
        $(video).css('display', 'block');
    }
    
    const arImage = document.getElementById('ar-image');
    if (arImage) {
        $(arImage).css('display', 'block');
    }
    
    const potElement = document.getElementById('ar-pot-element');
    if (potElement) {
        $(potElement).css({
            'display': 'block',
            'opacity': '1'
        });
    }
    
    $('#ar-instructions').fadeIn();
    console.log("Ready to retake photo");
}

function saveARImage() {
    console.log("Starting image save process");
    if (window.saveInProgress) {
        console.log("Save already in progress, ignoring duplicate request");
        return;
    }
    
    window.saveInProgress = true;
    
    const canvas = document.getElementById('ar-canvas');
    if (!canvas) {
        console.error("Canvas element not found!");
        alert("אין תמונה לשמירה. אנא צלמי קודם.");
        window.saveInProgress = false; // Reset flag
        return;
    }
    
    console.log("Canvas found, checking data-captured attribute:", canvas.getAttribute('data-captured'));
    
    try {
        const isEmpty = isCanvasEmpty(canvas);
        console.log("Is canvas empty:", isEmpty);
        
        if (isEmpty) {
            console.error("Canvas appears to be empty");
            alert("שגיאה בשמירת התמונה: הקנבס ריק. אנא צלמי שוב.");
            window.saveInProgress = false; // Reset flag
            return;
        }
        
        const ctx = canvas.getContext('2d');
        ctx.beginPath();
        ctx.closePath();
        let dataURL;
        
        try {
            dataURL = canvas.toDataURL('image/png');
            console.log("Canvas data URL generated successfully (prefix only):", dataURL.substring(0, 30) + "...");
        } catch (e) {
            console.error("Error generating data URL:", e);
            alert("שגיאה ביצירת התמונה: " + e.message);
            window.saveInProgress = false; // Reset flag
            return;
        }
        
        if (dataURL === 'data:,' || dataURL === 'data:image/png;base64,') {
            console.error("Canvas generated empty data URL");
            alert("שגיאה בשמירת התמונה: נתוני הקנבס ריקים");
            window.saveInProgress = false; // Reset flag
            return;
        }
        const link = document.createElement('a');
        link.href = dataURL;
        link.download = 'smartvase-ar-' + new Date().getTime() + '.png';
        
        console.log("Download link created:", link.download);
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        console.log("Image saved successfully");

        const notification = document.createElement('div');
        notification.className = 'save-notification';
        notification.textContent = 'התמונה נשמרה בהצלחה!';
        
        document.body.appendChild(notification);

        setTimeout(() => {
            notification.style.opacity = '1';
            setTimeout(() => {
                notification.style.opacity = '0';
                setTimeout(() => {
                    document.body.removeChild(notification);
                    window.saveInProgress = false;
                }, 300);
            }, 2000);
        }, 100);
    } catch (error) {
        console.error("Error saving image:", error);
        alert("שגיאה בשמירת התמונה: " + error.message);
        window.saveInProgress = false;
    }
}

function isCanvasEmpty(canvas) {
    const ctx = canvas.getContext('2d');
    const pixelBuffer = new Uint32Array(
        ctx.getImageData(0, 0, canvas.width, canvas.height).data.buffer
    );
    
    return !pixelBuffer.some(color => color !== 0);
}

function showLoadingSpinner() {
  if ($('#ar-loading-overlay').length === 0) {
    const loadingOverlay = $(`
      <div id="ar-loading-overlay">
        <div class="ar-loading">
          <div class="spinner"></div>
          <p>טוען את הכד...</p>
        </div>
      </div>
    `);
    
    $('#ar-canvas-container').append(loadingOverlay);
    console.log("אנימציית טעינה נוספה");
  } else {
    $('#ar-loading-overlay').show();
  }
}

function hideLoadingSpinner() {
  $('#ar-loading-overlay').fadeOut(300, function() {
  });
  console.log("אנימציית טעינה הוסתרה");
}

function initThreeJS(modelPath, color) {
  showLoadingSpinner();
  
  threeContainer = document.getElementById('three-container');
  const width = threeContainer.clientWidth;
  const height = threeContainer.clientHeight;
  threeScene = new THREE.Scene();
  threeCamera = new THREE.PerspectiveCamera(45, width / height, 0.1, 2000);
  threeCamera.position.z = 5;
  threeRenderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
  threeRenderer.setSize(width, height);
  threeRenderer.setClearColor(0x000000, 0);
  threeContainer.appendChild(threeRenderer.domElement);
  
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
  threeScene.add(ambientLight);
  
  const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
  directionalLight.position.set(1, 1, 1);
  threeScene.add(directionalLight);
  
  const r = parseInt(color.slice(1, 3), 16) / 255;
  const g = parseInt(color.slice(3, 5), 16) / 255;
  const b = parseInt(color.slice(5, 7), 16) / 255;
  
  const loader = new THREE.STLLoader();
  loader.load(modelPath, function(geometry) {
    const material = new THREE.MeshPhongMaterial({
      color: new THREE.Color(r, g, b),
      specular: 0x111111,
      shininess: 100
    });
    
    threePot = new THREE.Mesh(geometry, material);
    geometry.computeBoundingBox();
    const boundingBox = geometry.boundingBox;
    const size = new THREE.Vector3();
    boundingBox.getSize(size);
    const maxDim = Math.max(size.x, size.y, size.z);
    const scale = 1.5 / maxDim;
    
    threePot.scale.set(scale, scale, scale);
    threePot.rotation.x = -Math.PI / 2;
    
    const center = new THREE.Vector3();
    boundingBox.getCenter(center);
    threePot.position.set(-center.x * scale, 0, -center.z * scale);
    
    originalModelScale = {
      scale: scale,
      maxDim: maxDim
    };
    
    originalModelPosition = {
      x: threePot.position.x,
      y: threePot.position.y,
      z: threePot.position.z
    };
    
    threePot.userData = {
      originalScale: scale,
      maxDim: maxDim,
      center: center
    };
    
    threeScene.add(threePot);
    animate();
    enableDragging();
    
    isThreeInitialized = true;
    console.log('מודל תלת מימדי נטען בהצלחה');
    hideLoadingSpinner();
    addZoomInstructions();
  }, 

  function(xhr) {
    if (xhr.lengthComputable) {
      const percentComplete = xhr.loaded / xhr.total * 100;
      console.log('טעינת המודל: ' + Math.round(percentComplete) + '%');
    }
  }, 

  function(error) {
    console.error('שגיאה בטעינת המודל:', error);
    hideLoadingSpinner();
    alert('שגיאה בטעינת המודל. אנא נסו שוב.');
  });
  
  function animate() {
    requestAnimationFrame(animate);
    
    if (threePot && shouldAnimate) {
      threePot.rotation.y += 0.01;
    }
    
    threeRenderer.render(threeScene, threeCamera);
  }
  
  window.addEventListener('resize', function() {
    if (threeContainer) {
      const width = threeContainer.clientWidth;
      const height = threeContainer.clientHeight;
      
      threeCamera.aspect = width / height;
      threeCamera.updateProjectionMatrix();
      threeRenderer.setSize(width, height);
    }
  });
  
  setupZoomControls();
}

function setupZoomControls() {
    threeContainer.addEventListener('wheel', function(event) {
        event.preventDefault();
        
        if (!isThreeInitialized || !threePot) return;
        
        const delta = event.deltaY || event.detail || event.wheelDelta;
        
        if (delta > 0) {
            zoomOut();
        } else {
            zoomIn();
        }
    }, { passive: false });
    
    let initialPinchDistance = 0;
    
    threeContainer.addEventListener('touchstart', function(event) {
        if (event.touches.length === 2) {
            initialPinchDistance = getPinchDistance(event);
        }
    }, { passive: true });
    
    threeContainer.addEventListener('touchmove', function(event) {
        if (event.touches.length === 2) {
            event.preventDefault();
            
            const currentPinchDistance = getPinchDistance(event);
            const pinchDelta = currentPinchDistance - initialPinchDistance;
            
            if (Math.abs(pinchDelta) > 5) {
                if (pinchDelta > 0) {
                    zoomIn();
                } else {
                    zoomOut();
                }
                initialPinchDistance = currentPinchDistance;
            }
        }
    }, { passive: false });
    addZoomButtons();
}

function getPinchDistance(event) {
    const touch1 = event.touches[0];
    const touch2 = event.touches[1];
    const dx = touch1.clientX - touch2.clientX;
    const dy = touch1.clientY - touch2.clientY;
    return Math.sqrt(dx * dx + dy * dy);
}

function zoomIn() {
    if (!threePot || !isThreeInitialized) return;
    currentZoom = Math.min(currentZoom + zoomStep, maxZoom);
    applyZoom();
    console.log('זום פנימה:', currentZoom);
}

function zoomOut() {
    if (!threePot || !isThreeInitialized) return;
    currentZoom = Math.max(currentZoom - zoomStep, minZoom);
    applyZoom();
    console.log('זום החוצה:', currentZoom);
}

function zoomOut() {
    if (!threePot || !isThreeInitialized) return;
    
    currentZoom = Math.max(currentZoom - zoomStep, minZoom);
    applyZoom();
}

function applyZoom() {
    if (!threePot || !isThreeInitialized || !originalModelScale) return;
    const newScale = originalModelScale.scale * currentZoom;
    threePot.scale.set(newScale, newScale, newScale);
    updateZoomLabel();
}

function addZoomButtons() {
    const zoomControls = $('<div class="zoom-controls"></div>').css({
        position: 'absolute',
        right: '20px',
        top: '50%',
        transform: 'translateY(-50%)',
        display: 'flex',
        flexDirection: 'column',
        zIndex: 1001
    });
    
    const zoomInBtn = $('<button class="zoom-btn zoom-in">+</button>').css({
        width: '40px',
        height: '40px',
        fontSize: '24px',
        margin: '5px',
        borderRadius: '50%',
        border: 'none',
        background: 'rgba(255, 122, 89, 0.8)',
        color: 'white',
        cursor: 'pointer'
    });
    
    const zoomOutBtn = $('<button class="zoom-btn zoom-out">-</button>').css({
        width: '40px',
        height: '40px',
        fontSize: '24px',
        margin: '5px',
        borderRadius: '50%',
        border: 'none',
        background: 'rgba(255, 122, 89, 0.8)',
        color: 'white',
        cursor: 'pointer'
    });
    
    const zoomLabel = $('<div class="zoom-label"></div>').css({
        textAlign: 'center',
        color: 'white',
        textShadow: '0 0 4px black',
        marginTop: '5px',
        fontSize: '14px'
    });
    
    zoomControls.append(zoomInBtn, zoomOutBtn, zoomLabel);
    $('#ar-pot-container').append(zoomControls);
    zoomInBtn.on('click', function() {
        zoomIn();
    });
    zoomOutBtn.on('click', function() {
        zoomOut();
    });
    updateZoomLabel();
}

function updateZoomLabel() {
    const zoomLabel = $('.zoom-label');
    if (zoomLabel.length) {
        zoomLabel.text(`זום: ${Math.round(currentZoom * 100)}%`);
    }
}

function addZoomInstructions() {
    $('.zoom-instructions').remove();
    const instructions = $('<div class="zoom-instructions"></div>').css({
        position: 'absolute',
        bottom: '70px',
        left: '50%',
        transform: 'translateX(-50%)',
        color: 'white',
        textShadow: '0 0 4px black',
        fontWeight: 'bold',
        zIndex: 998,
        padding: '10px',
        backgroundColor: 'rgba(0,0,0,0.5)',
        borderRadius: '5px',
        maxWidth: '90%',
        textAlign: 'center'
    }).text('השתמש בגלגלת העכבר או בכפתורי הזום כדי להגדיל/להקטין את הכד');
    $('#ar-pot-container').append(instructions);
    setTimeout(function() {
        instructions.fadeOut();
    }, 5000);
}

$(document).ready(function() {
    $(document).off('click', '#retake-photo').on('click', '#retake-photo', function() {
        console.log('Retake photo button clicked');
        retakePhoto();
    });
    
    $(document).off('click', '#take-photo').on('click', '#take-photo', function() {
        console.log('Take photo button clicked');
        captureARPhoto();
    });
    
    $(document).off('click', '#save-ar-image').on('click', '#save-ar-image', function() {
        console.log('Save image button clicked');
        saveARImage();
    });
    
    $('body').append('<div id="debug-log" ></div>');
    
    const originalConsoleLog = console.log;
    const originalConsoleError = console.error;
    const originalConsoleWarn = console.warn;
    console.log = function() {
        const args = Array.from(arguments);
        originalConsoleLog.apply(console, args);
        
        const debugLog = $('#debug-log');
        if (debugLog.length) {
            debugLog.append('<div><span style="color:#8F8;">LOG:</span> ' + args.map(arg => typeof arg === 'object' ? JSON.stringify(arg) : arg).join(' ') + '</div>');
            debugLog.scrollTop(debugLog[0].scrollHeight);
        }
    };
    
    console.error = function() {
        const args = Array.from(arguments);
        originalConsoleError.apply(console, args);
        
        const debugLog = $('#debug-log');
        if (debugLog.length) {
            debugLog.append('<div><span style="color:#F88;">ERROR:</span> ' + args.map(arg => typeof arg === 'object' ? JSON.stringify(arg) : arg).join(' ') + '</div>');
            debugLog.scrollTop(debugLog[0].scrollHeight);
        }
    };
    
    console.warn = function() {
        const args = Array.from(arguments);
        originalConsoleWarn.apply(console, args);
        
        const debugLog = $('#debug-log');
        if (debugLog.length) {
            debugLog.append('<div><span style="color:#FF8;">WARN:</span> ' + args.map(arg => typeof arg === 'object' ? JSON.stringify(arg) : arg).join(' ') + '</div>');
            debugLog.scrollTop(debugLog[0].scrollHeight);
        }
    };
    
    $(document).on('keydown', function(e) {
        if (e.keyCode === 123) { // F12
            $('#debug-log').toggle();
            e.preventDefault();
        }
    });
});

function disableDragging() {
    console.log("נטרול גרירת הכד");

    const dragElement = $('#three-container');

    if (dragElement.length) {
        dragElement.off('mousedown touchstart');
        dragElement.css({
            'cursor': 'default',
            'pointer-events': 'none'
        });
        $(document).off('mousemove.arDrag touchmove.arDrag mouseup.arDrag touchend.arDrag');
        dragElement.attr('data-draggable', 'false');
        console.log("גרירה נוטרלה בהצלחה");
    } else {
        console.warn("אלמנט הכד לא נמצא לנטרול גרירה");
    }
}

function enableDragging() {
    console.log("הפעלת גרירת הכד מחדש");
    const dragElement = $('#three-container');

    if (dragElement.length) {
        dragElement.css({
            'cursor': 'move',
            'pointer-events': 'auto'
        });
        makeARPotDraggable(dragElement);
        dragElement.attr('data-draggable', 'true');
        console.log("גרירה הופעלה מחדש בהצלחה");
    } else {
        console.warn("אלמנט הכד לא נמצא להפעלת גרירה");
    }
}
$(document).ready(function() {
        setupARButtons();
    $(document).on('click', '#show-in-room', function(e) {
        console.log("כפתור AR נלחץ");
        showARSubmenu();
        e.preventDefault();
        return false;
    });

    $(document).on('click', '.ar-overlay', function() {
        closeARSubmenu();
    });

    $(document).on('click', '.close-ar-btn', function(e) {
        console.log("נלחץ כפתור סגירה");
        closeARSubmenu();
        e.stopPropagation();
        return false;
    });

    $(document).on('keydown', function(e) {
        if (e.key === "Escape" || e.keyCode === 27) {
            if ($('.ar-submenu').is(':visible')) {
                console.log("נלחץ ESC - סוגר תפריט AR");
                closeARSubmenu();
                return false;
            }
            if ($('#ar-container').is(':visible')) {
                console.log("נלחץ ESC - סוגר תצוגת AR");
                closeAR();
                return false;
            }
        }
    });

    $(document).on('click', '.ar-submenu', function(e) {
        e.stopPropagation();
    });

    $(document).on('click', '#ar-camera', function() {
        closeARSubmenu();
        setTimeout(function() {
            startARWithCamera();
        }, 300);
    });

    $(document).on('click', '#ar-upload', function() {
        $('#image-upload').click();
    });
    
    $(document).on('click', '#image-upload', function() {
        $(this).val('');
    });
    
    $(document).on('change', '#image-upload', function(event) {
        if (event.target.files.length > 0) {
            closeARSubmenu();
            const file = event.target.files[0];
            const imageURL = URL.createObjectURL(file);
            setTimeout(function() {
                startARWithImage(imageURL);
            }, 300);
        }
    });
    $(document).on('click', '#close-ar', function() {
        closeAR();
    });
    $(document).on('click', '#take-photo', function() {
        captureARPhoto();
    });
    $(document).on('click', '#save-ar-image', function() {
        saveARImage();
    });
    
    function fixXButton() {
        console.log("מתקן את כפתור ה-X");
        $(document).off('click', '.ar-close, .close-ar-btn, .ar-submenu button:contains("✕")').on('click', '.ar-close, .close-ar-btn, .ar-submenu button:contains("✕")', function(e) {
            console.log("כפתור סגירה כלשהו נלחץ");
            closeARSubmenu();
            e.stopPropagation();
            return false;
        });
        
        $('.ar-close, .close-ar-btn').css({
            'position': 'absolute',
            'top': '10px',
            'right': '10px',
            'background': 'none',
            'border': 'none',
            'font-size': '24px',
            'cursor': 'pointer',
            'z-index': '10001',
            'display': 'block'
        });
    }
    fixXButton();
    setTimeout(fixXButton, 500);
});