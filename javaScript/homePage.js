console.log("✅ homePage.js loaded!");

const colorNames = {
  "#e7d5d5": "לבן",
  "#000000": "שחור",
  "#f14a4a": "אדום",
  "#99db99": "ירוק",
  "#7878f1": "כחול",
  "#ffeb94": "צהוב",
  "#dd8add": "ורוד",
  "#99dada": "טורקיז",
  "#aaaaaa": "אפור",
  "#ffa500": "כתום"
};

// הוסיפי זאת בתחילת הקוד שלך, ליד המיפוי של הצבעים
const modelImages = {
  'models/vase1.stl': '/images/vase1.png',
  'models/vase2.stl': '/images/vase2.png',
  'models/vase3.stl': '/images/vase3.png',
  'models/vase4.stl': '/images/vase4.png',
  'models/vase5.stl': '/images/vase5.png',
  'models/vase6.stl': '/images/vase6.png',
  'models/vase7.stl': '/images/vase7.png',
  'models/vase8.stl': '/images/vase8.png',
};

// או אם אין לך תמונות ואת רוצה להשתמש באלמנטים מתוך העמוד הראשי:
const modelIdMapping = {
  'models/vase1.stl': 'vase1',
  'models/vase2.stl': 'vase2',
  'models/vase3.stl': 'vase3',
  'models/vase4.stl': 'vase4',
  'models/vase5.stl': 'vase5',
  'models/vase6.stl': 'vase6',
  'models/vase7.stl': 'vase7',
  'models/vase8.stl': 'vase8',
};

let initialCameraDistance = 150;
let scene, camera, renderer, potMesh, controls;
let cartCount = 0;
let cartItems = [];
let totalPrice = 0;
let currentModelPath = 'models/vase1.stl';
let paypalRendered = false;

function fillOrderFormFromSession() {
  $.get("../php/login.php?getUser=1", function (data) {
    try {
      const user = typeof data === 'string' ? JSON.parse(data) : data;
      if (user && !user.error) {
        $('input[name="first_name"]').val(user.first_name).prop('readonly', true);
        $('input[name="last_name"]').val(user.last_name).prop('readonly', true);
        $('input[name="email"]').val(user.email).prop('readonly', true);
        $('input[name="phone"]').val(user.phone).prop('readonly', true);
      }
    } catch (error) {
      console.error("Error parsing user data:", error);
    }
  });
}

function init3DModel() {
  const container = document.getElementById("3d-model-container");
   if (!container || container.offsetParent === null) {
    console.log("Container not visible, skipping 3D model initialization");
    return;
  }
  const width = container.clientWidth;
  const height = container.clientHeight;

  scene = new THREE.Scene();

  camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
  camera.position.set(0, 0, 150);

  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setSize(width, height);
  renderer.setClearColor(0xf9f9f9);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  container.appendChild(renderer.domElement);

  const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
  scene.add(ambientLight);

  const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
  directionalLight.position.set(50, 50, 100);
  directionalLight.castShadow = true;
  directionalLight.shadow.mapSize.width = 1024;
  directionalLight.shadow.mapSize.height = 1024;
  directionalLight.shadow.radius = 4;
  scene.add(directionalLight);

  const backLight = new THREE.DirectionalLight(0xffffff, 0.5);
  backLight.position.set(-50, -50, -100);
  scene.add(backLight);

  controls = new THREE.OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.05;
  controls.rotateSpeed = 0.8;

  loadSTLModel(currentModelPath);

  function animate() {
    requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene, camera);
  }

  animate();

  // התאמה לגודל חלון משתנה (רספונסיבי)
  window.addEventListener('resize', () => {
    const width = container.clientWidth;
    const height = container.clientHeight;
    renderer.setSize(width, height);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  });
}

function loadSTLModel(modelPath) {
  console.log("Loading STL model:", modelPath);
  const loader = new THREE.STLLoader();
  
    $('.ar-loading').show();

  // Get current values from sliders ONCE before loading
  const height = parseFloat($('#height-slider').val());
  const width = parseFloat($('#width-slider').val());
  
  // Get current selected color 
  const selectedColorBox = $('.color-box.selected');
  const selectedColor = selectedColorBox.length > 0 ? selectedColorBox.data('color') : "#f14a4a";

  loader.load(
    modelPath,
    function (geometry) {
      geometry.computeBoundingBox();
      geometry.center();

      const material = new THREE.MeshStandardMaterial({
        color: new THREE.Color(selectedColor), // Use selected color
        roughness: 0.5,
        metalness: 0.1
      });

      if (potMesh) {
        scene.remove(potMesh);
      }

      potMesh = new THREE.Mesh(geometry, material);
      potMesh.rotation.set(-Math.PI / 2, 0, 0);
      potMesh.castShadow = true;
      potMesh.receiveShadow = true;

      // חישוב גודל מקורי
      const box = new THREE.Box3().setFromObject(potMesh);
      const size = new THREE.Vector3();
      box.getSize(size);
      const center = new THREE.Vector3();
      box.getCenter(center);

      const modelHeight = size.z;
      const modelWidth = (size.x + size.y) / 2;

      potMesh.userData.originalHeight = modelHeight;
      potMesh.userData.originalWidth = modelWidth;

      // Use the height and width we captured BEFORE
      const scaleZ = height / modelHeight;
      const scaleXY = width / modelWidth;
      potMesh.scale.set(scaleXY, scaleXY, scaleZ);

      scene.add(potMesh);

      // עדכון מרכז
      potMesh.updateMatrixWorld(true);
      const updatedBox = new THREE.Box3().setFromObject(potMesh);
      const newCenter = new THREE.Vector3();
      updatedBox.getCenter(newCenter);
      controls.target.copy(newCenter);

      // חישוב מרחק לפי גודל מודל
      const updatedSize = new THREE.Vector3();
      updatedBox.getSize(updatedSize);
      const maxSize = Math.max(updatedSize.x, updatedSize.y, updatedSize.z);
      const fov = camera.fov * (Math.PI / 180);
      const distance = (maxSize / 2) / Math.tan(fov / 2);
      const cameraBackFactor = 2.8;
      camera.position.copy(newCenter.clone().add(new THREE.Vector3(0, 0, distance * cameraBackFactor)));

      controls.update();

      // קרקע - Only add if not already in scene
      let ground = scene.getObjectByName('ground');
      if (!ground) {
        ground = new THREE.Mesh(
          new THREE.PlaneGeometry(200, 200),
          new THREE.ShadowMaterial({ opacity: 0.15 })
        );
        ground.name = 'ground';
        ground.rotation.x = -Math.PI / 2;
        ground.position.y = -30;
        ground.receiveShadow = true;
        scene.add(ground);
      }

      // עדכון טקסט של סלאידרים
      $('#height-value').text(height + ' ס"מ');
      $('#width-value').text(width + ' ס"מ');
      
        $('.ar-loading').hide();

      // Removed automatic price calculation - it will only happen when button is clicked
    },
    undefined,
    function (error) {
      console.error('שגיאה בטעינת STL:', error, 'Model path:', modelPath);
      alert('נתקלנו בבעיה בטעינת הדגם. אנא נסה שנית');
      
       $('.ar-loading').hide();


    }
  );
}

function getTextureName(value) {
  switch (value) {
    case 'smooth': return 'חלק';
    case 'rough': return 'מחוספס';
    case 'matte': return 'מט';
    default: return value;
  }
}

function updateCartDisplay() {
  $('#cart-count').text(cartCount);
}


  
function addItemToCart() {
  const height = $('#height-slider').val();
  const width = $('#width-slider').val();
  const selectedColorBox = $('.color-box.selected');
  const color = selectedColorBox.data('color');
  const texture = $('#texture-select').val();

  if (!selectedColorBox.length) {
    alert('אנא בחר צבע לפני הוספה לעגלה.');
    return false;
  }

  if (!texture) {
    alert('אנא בחר טקסטורה לפני הוספה לעגלה.');
    return false;
  }

  // Create flying item element - make it larger and more visible
  const flyingItem = $('<div class="flying-item"></div>');
  
    const startElement = document.getElementById('add-to-cart');
    const cartIconElement = document.getElementById('cart-icon');
    
    const startRect = startElement.getBoundingClientRect();
    const cartRect = cartIconElement.getBoundingClientRect();
    
    const startPosition = {
      left: startRect.left + startRect.width / 2,
      top: startRect.top + startRect.height / 2
    };
    
    const cartIconPosition = {
      left: cartRect.left + cartRect.width / 2,
      top: cartRect.top + cartRect.height / 2
    };

  // Style the flying item and make it visible immediately
  flyingItem.css({
    position: 'fixed',
    width: '70px',
    height: '70px',
    borderRadius: '50%',
    backgroundColor: color,
    boxShadow: '0 0 20px 5px rgba(255,255,255,0.7), 0 0 30px 10px ' + color,
    border: '4px solid white',
    zIndex: 10000,
    left: startPosition.left - 35,
    top: startPosition.top - 35,

    opacity: 1 // Set to 1 immediately
  });
  
  // Add the flying item to the body
  $('body').append(flyingItem);
  
  // Start animation immediately with a small initial size change
  flyingItem.animate({
    width: '75px', 
    height: '75px'
  }, 150, function() {
    // Then go back to normal size
    $(this).animate({
      width: '70px',
      height: '70px'
    }, 150, function() {
      // NEW ANIMATION PATH: Move directly upward first (higher than before)
      $(this).animate({
      top: startPosition.top - 150 // שלב ביניים למעלה
    }, 300, 'easeOutQuad', function () {
      $(this).animate({
        left: cartIconPosition.left - 15,
        top: cartIconPosition.top - 15,
        width: '30px',
        height: '30px'
      }, 500, 'easeInQuad', function () {

          // Add shine effect to cart icon
          const shine = $('<div class="cart-shine"></div>');
          $('#cart-icon').append(shine);
          
          // Make cart icon "pop"
          $('#cart-icon').css({
            transform: 'scale(1.7)'
          }).delay(300).queue(function(next){
            $(this).css({
              transform: 'scale(1)'
            });
            next();
          });
          
          setTimeout(function() {
            shine.remove();
          }, 700);
          
          // Remove the flying item
          flyingItem.remove();
          
          // Now add the actual item to the cart
          const colorName = colorNames[color] || color;
          const price = (parseInt(height) + parseInt(width)) * 2;

          const item = {
            id: Date.now(),
            height,
            width,
            color,
            colorName,
            texture,
            price,
            model: currentModelPath
          };

          cartItems.push(item);
          totalPrice += price;
          cartCount++;

          const listItem = `
            <li data-id="${item.id}">
              <span style="float:left; color: red; cursor: pointer;" class="remove-item">✖</span>
              גובה: ${height} ס"מ, רוחב: ${width} ס"מ<br>
              צבע: ${colorName}, טקסטורה: ${getTextureName(texture)}<br>
              מחיר: ${price} ש"ח
            </li>
          `;

          $('#cart-items').append(listItem);
          $('#total-price').text("סה\"כ: " + totalPrice + " ש\"ח");
          updateCartDisplay();
          
          // Show the cart after adding an item
          $('#cart-details').show();
        });
      });
    });
  });
  
  // Add easing function if jQuery UI is not available
  if (!$.easing.easeOutQuad) {
    $.easing.easeOutQuad = function(x, t, b, c, d) {
      return -c *(t/=d)*(t-2) + b;
    };
  }
  
  if (!$.easing.easeInQuad) {
    $.easing.easeInQuad = function(x, t, b, c, d) {
      return c*(t/=d)*t + b;
    };
  }

  return true;
}

function login() {
  const user = $('#username').val();
  const pass = $('#password').val();

  if (!user || !pass) {
    alert("נא למלא שם משתמש וסיסמה.");
    return;
  }

  console.log("Attempting login with:", user);

  $.post("../php/login.php", { email: user, password: pass }, function (response) {
    console.log("Login response received:", response);
    try {
      const res = typeof response === 'string' ? JSON.parse(response) : response;
      console.log("Parsed response:", res);

      if (res.status === "success") {
        $('#login-screen').hide();
        $('#home-screen').show();
        $('#floating-buttons').show();
      } else {
        alert("שם משתמש או סיסמה שגויים");
      }
    } catch (error) {
      console.error("שגיאה בפענוח JSON:", error);
      alert("שגיאת התחברות.");
    }
  }).fail(function (xhr, status, error) {
    console.error("POST failed:", status, error);
    alert("שגיאת התחברות. אנא נסה שנית מאוחר יותר.");
  });
}

// Make sure the login event handler is properly attached
$(document).ready(function() {
  $('#login-btn').on('click', function(e) {
    e.preventDefault();
    console.log("Login button clicked");
    login();
  });

  // Ensure Enter key works in login fields
  $('#username, #password').on('keypress', function(event) {
    if (event.keyCode === 13) {
      event.preventDefault();
      console.log("Enter key pressed in login field");
      login();
    }
  });
});

function updateModelScaleAndCamera() {
  const height = parseFloat($('#height-slider').val());
  const width = parseFloat($('#width-slider').val());

  if (potMesh && potMesh.userData.originalHeight && potMesh.userData.originalWidth) {
    const scaleZ = height / potMesh.userData.originalHeight;
    const scaleXY = width / potMesh.userData.originalWidth;

    potMesh.scale.set(scaleXY, scaleXY, scaleZ);
    potMesh.updateMatrixWorld(true);

    // עדכון מרכז בלבד, לא מזיזים את המצלמה
    const box = new THREE.Box3().setFromObject(potMesh);
    const center = new THREE.Vector3();
    box.getCenter(center);
    controls.target.copy(center);

    controls.update();
  }

  $('#height-value').text(height + ' ס"מ');
  $('#width-value').text(width + ' ס"מ');
}

function goToCheckout() {
  $('#design-screen').hide();
  $('#cart-container').hide();
  $('#checkout-screen').show();
  updateFinalTotal();
}

function updateFinalTotal() {
  const selectedShipping = $('#shipping-type option:selected');
  const shippingCost = parseFloat(selectedShipping.data('price')) || 0;
  const finalTotal = totalPrice + shippingCost;
  $('#final-total').text('סה"כ לתשלום: ' + finalTotal + ' ש"ח');
  return finalTotal;
}

function renderPayPalButton() {
  $('#paypal-button-container').empty();
  
  if (paypalRendered) return;
  
  const finalTotal = updateFinalTotal();
  
  paypal.Buttons({
    createOrder: function (data, actions) {
      return actions.order.create({
        purchase_units: [{
          amount: {
            value: finalTotal.toFixed(2)
          },
          description: 'הזמנה מ-SmartVase'
        }]
      });
    },
    onApprove: function (data, actions) {
      return actions.order.capture().then(function (details) {
        // Show loading overlay
        const loadingOverlay = $('<div id="loading-overlay"><div class="spinner"></div><p>מעבד את ההזמנה שלך...</p></div>');
        $('body').append(loadingOverlay);
        
        const formData = $('#order-form').serialize();
        
        // שליחת הזמנה לשרת
        $.ajax({
          url: '../php/submit_order.php', // Update path if needed
          method: 'POST',
          data: {
            orderData: formData,
            cartItems: JSON.stringify(cartItems),
            total: finalTotal
          },
          success: function(response) {
            // Remove loading overlay
            $('#loading-overlay').remove();
            
            if (response === "success") {
              // Add success message
              const successMessage = $('<div class="order-success"><i class="fas fa-check-circle"></i> תודה, ההזמנה בוצעה בהצלחה!</div>');
              $('#checkout-screen').prepend(successMessage);
              
              // Show message for 3 seconds then redirect
              setTimeout(function() {
                // איפוס עגלה
                resetCart();
                $('#checkout-screen').hide();
                $('#design-screen').show();
              }, 3000);
            } else {
              console.error('Order submission error:', response);
              alert('שגיאה בשליחת ההזמנה: ' + response);
            }
          },
          error: function(xhr, status, error) {
            // Remove loading overlay
            $('#loading-overlay').remove();
            
            console.error('AJAX error:', status, error);
            alert('שגיאה בשליחת ההזמנה לשרת. אנא נסה שנית.');
          }
        });
      });
    },
    onCancel: function () {
      alert('התשלום בוטל.');
    },
    onError: function (err) {
      console.error('שגיאה בתשלום:', err);
      alert('אירעה שגיאה במהלך התשלום.');
    }
  }).render('#paypal-button-container');
  
  paypalRendered = true;
}

function resetCart() {
  cartItems = [];
  cartCount = 0;
  totalPrice = 0;
  $('#cart-items').empty();
  $('#cart-count').text('0');
  $('#total-price').text('סה"כ: 0 ש"ח');
  $('#paypal-button-container').empty();
  paypalRendered = false;
}

function loadUserOrders() {
  $('#ordersContainer').html('<div class="loading"><i class="fas fa-spinner fa-spin"></i> טוען הזמנות...</div>');
  
  $.get("../php/login.php?getOrders=1", function(response) {
    try {
      const orders = typeof response === 'string' ? JSON.parse(response) : response;

      if (orders.length === 0) {
        $('#ordersContainer').html('<div class="no-orders"><i class="fas fa-info-circle"></i> אין הזמנות קודמות.</div>');
        return;
      }
      
      let ordersHtml = '<div class="orders-container">';
      
      orders.forEach(order => {
        // המרת תאריך לפורמט ישראלי
        const orderDate = new Date(order.date);
        const formattedDate = orderDate.toLocaleDateString('he-IL', {
          year: 'numeric',
          month: 'numeric',
          day: 'numeric'
        });
        
        // סטטוס הזמנה אם קיים
        const statusText = order.status ? getStatusText(order.status) : 'בטיפול';
        
        ordersHtml += `
          <div class="order-item">
            <h3>הזמנה #${order.order_number}</h3>
            <p><i class="far fa-calendar-alt"></i> <strong>תאריך:</strong> ${formattedDate}</p>
            <p><i class="fas fa-truck"></i> <strong>משלוח:</strong> ${getShippingText(order.shipping)}</p>
            <p><i class="fas fa-map-marker-alt"></i> <strong>יעד:</strong> ${order.city || ''}, ${order.street || ''} ${order.apartment || ''}</p>
            <p><i class="fas fa-shekel-sign"></i> <strong>סכום:</strong> ${order.price} ש"ח</p>
            <p><i class="fas fa-clipboard-check"></i> <strong>סטטוס:</strong> ${statusText}</p>
            <button class="order-details-btn" data-id="${order.order_number}">הצג פרטים</button>
          </div>
        `;
      });
      
      ordersHtml += '</div>';
      $('#ordersContainer').html(ordersHtml);
      
      // הוספת אירועי לחיצה על כפתורי פרטים
      $('.order-details-btn').click(function() {
        const orderId = $(this).data('id');
        showOrderDetails(orderId);
      });
      
    } catch (e) {
      console.error("Error parsing orders:", e, "Original response:", response);
      $('#ordersContainer').html('<p class="error-message"><i class="fas fa-exclamation-triangle"></i> שגיאה בטעינת הזמנות. אנא נסה שנית.</p>');
    }
  }).fail(function(xhr, status, error) {
    console.error("AJAX error:", status, error);
    $('#ordersContainer').html('<p class="error-message"><i class="fas fa-exclamation-triangle"></i> שגיאה בתקשורת עם השרת. אנא נסה שנית.</p>');
  });
}

function getStatusText(status) {
  switch(status) {
    case 'pending': return 'ממתין לאישור';
    case 'confirmed': return 'אושר';
    case 'shipped': return 'נשלח';
    case 'delivered': return 'נמסר';
    default: return status;
  }
}

function getShippingText(shipping) {
  switch(shipping) {
    case 'regular': return 'משלוח רגיל';
    case 'express': return 'שליח עד הבית';
    case 'pickup': return 'איסוף עצמי';
    default: return shipping;
  }
}

function showOrderDetails(orderId) {
  $.get(`../php/login.php?getOrderDetails=${orderId}`, function(response) {
    try {
      // Handle the response properly
      let orderDetails;
      if (typeof response === 'string') {
        // Remove "fail" prefix if present
        if (response.startsWith("fail")) {
          response = response.substring(4);
        }
        orderDetails = JSON.parse(response);
      } else {
        orderDetails = response;
      }
      
      if (!orderDetails || orderDetails.error) {
        alert('לא נמצאו פרטים עבור הזמנה זו');
        return;
      }
      
      // Use default values for missing fields - *** THIS IS THE KEY FIX ***
      const shippingText = orderDetails.shipping ? getShippingText(orderDetails.shipping) : 'רגיל';
      const price = orderDetails.price ? `${orderDetails.price} ש"ח` : 'לא זמין';
      const statusText = orderDetails.status ? getStatusText(orderDetails.status) : 'בטיפול';
      const city = orderDetails.city || '';
      const street = orderDetails.street || '';
      const apartment = orderDetails.apartment || '';
      const address = [city, street, apartment].filter(Boolean).join(', ') || 'לא צוין';
      
      // Convert date to Israeli format
      const orderDate = orderDetails.date ? new Date(orderDetails.date) : new Date();
      const formattedDate = orderDate.toLocaleDateString('he-IL', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
      
      // Create HTML for modal
      let detailsHtml = `
        <div class="order-details-modal">
          <div class="modal-content">
            <span class="close-modal">&times;</span>
            <h3>פרטי הזמנה #${orderId}</h3>
            <div class="order-status">
              <p><strong>תאריך:</strong> ${formattedDate}</p>
              <p><strong>סוג משלוח:</strong> ${shippingText}</p>
              <p><strong>כתובת:</strong> ${address}</p>
              <p><strong>סכום:</strong> ${price}</p>
              <p><strong>סטטוס:</strong> ${statusText}</p>
            </div>
            
            <h4>פריטים בהזמנה:</h4>
            <div class="order-items">
      `;
      
      if (orderDetails.models && orderDetails.models.length > 0) {
        orderDetails.models.forEach((model, index) => {
          // Default values for model properties
          const modelHeight = model.height || 'לא צוין';
          const modelWidth = model.width || 'לא צוין';
          const modelColor = model.color || '#aaaaaa';
          const modelTexture = model.texture || 'חלק';
          
          const colorName = colorNames[modelColor] || modelColor;
          const colorStyle = `background-color: ${modelColor}; display: inline-block; width: 15px; height: 15px; border-radius: 50%; margin-right: 5px; vertical-align: middle;`;
          
          // Ensure we have the full model path
          const fullModelPath = model.model_number && model.model_number.includes('models/') 
            ? model.model_number 
            : `models/${model.model_number || 'vase1.stl'}`;
          
          detailsHtml += `
            <div class="order-item-detail">
              <h4>פריט ${index + 1}</h4>
              <div class="item-content">
                <div class="model-image">
                  <canvas id="vase-canvas-${orderId}-${index}" width="80" height="80" 
                          data-image="../images/${fullModelPath.replace('models/', '').replace('.stl', '')}.png"
                          data-color="${modelColor}"
                          class="vase-canvas"></canvas>
                </div>
                <div class="item-details">
                  <p><strong>גובה:</strong> ${modelHeight} ס"מ</p>
                  <p><strong>רוחב:</strong> ${modelWidth} ס"מ</p>
                  <p><strong>צבע:</strong> <span style="${colorStyle}"></span> ${colorName}</p>
                  <p><strong>טקסטורה:</strong> ${getTextureName(modelTexture)}</p>
                </div>
              </div>
              <button id="hzamn-mwhw-dwmh" class="reorder-btn" data-model="${fullModelPath}" 
                  data-height="${modelHeight}" data-width="${modelWidth}" 
                  data-color="${modelColor}" data-texture="${modelTexture}">
                  <i class="fas fa-edit"></i> הזמן מוצר דומה
              </button>
            </div>
          `;
        });
      } else {
        detailsHtml += `<p>לא נמצאו פרטי מוצרים להזמנה זו</p>`;
      }
      
      detailsHtml += `
            </div>
          </div>
        </div>
      `;
      
      // Add modal to page
      $('body').append(detailsHtml);
      
      // Animation for opening modal
      $('.modal-content').css('opacity', '0').animate({
        opacity: 1
      }, 300);
      
      // Handle closing window
      $('.close-modal').click(function() {
        $('.modal-content').animate({
          opacity: 0
        }, 300, function() {
          $('.order-details-modal').remove();
        });
      });
      
      // Close by clicking outside modal
      $('.order-details-modal').click(function(e) {
        if ($(e.target).hasClass('order-details-modal')) {
          $('.modal-content').animate({
            opacity: 0
          }, 300, function() {
            $('.order-details-modal').remove();
          });
        }
      });
      
      // Draw all vases
      setTimeout(function() {
        $('.vase-canvas').each(function() {
          const canvas = this;
          const imageSrc = $(canvas).data('image');
          const color = $(canvas).data('color');
          
          colorVase(canvas, imageSrc, color);
        });
      }, 100);
      
    } catch(e) {
      console.error("Error parsing order details:", e, "Response:", response);
      alert('שגיאה בטעינת פרטי ההזמנה');
    }
  }).fail(function(xhr, status, error) {
    console.error("AJAX error:", status, error);
    alert('שגיאה בטעינת פרטי ההזמנה');
  });
}

// פונקציה לצביעת הכד
function colorVase(canvas, imageSrc, color) {
  const ctx = canvas.getContext('2d');
  const img = new Image();

  img.onload = function () {
    const ratio = Math.min(canvas.width / img.width, canvas.height / img.height);
    const centerX = (canvas.width - img.width * ratio) / 2;
    const centerY = (canvas.height - img.height * ratio) / 2;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, centerX, centerY, img.width * ratio, img.height * ratio);

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const pixels = imageData.data;

    let r = 170, g = 170, b = 170;
    if (color.startsWith('#')) {
      r = parseInt(color.slice(1, 3), 16);
      g = parseInt(color.slice(3, 5), 16);
      b = parseInt(color.slice(5, 7), 16);
    }

    for (let i = 0; i < pixels.length; i += 4) {
      const alpha = pixels[i + 3];
      if (alpha > 0) {
        const gray = (pixels[i] + pixels[i + 1] + pixels[i + 2]) / 3 / 255;

        const blendFactor = 0.6; // אפשר גם 0.7–0.8 לצבעים בהירים יותר
        pixels[i]     = r * blendFactor + gray * r * (1 - blendFactor);
        pixels[i + 1] = g * blendFactor + gray * g * (1 - blendFactor);
        pixels[i + 2] = b * blendFactor + gray * b * (1 - blendFactor);
      }
    }

    ctx.putImageData(imageData, 0, 0);
  };

  img.onerror = function () {
    ctx.fillStyle = color;
    ctx.fillRect(10, 10, canvas.width - 20, canvas.height - 20);
    ctx.fillStyle = '#ffffff';
    ctx.font = '10px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('אין תמונה', canvas.width / 2, canvas.height / 2);
  };

  img.src = imageSrc;
}

function reorderItem(modelPath, height, width, color, texture) {
console.log("Reordering item:", modelPath, height, width, color, texture);
  
  // Convert dimensions to numbers
  const heightValue = parseInt(height);
  const widthValue = parseInt(width);
  
  // Close modal first
  $('.modal-content').animate({
    opacity: 0
  }, 300, function() {
    $('.order-details-modal').remove();
    
    // Switch to design screen
    $('#personal-area').hide();
    $('#design-screen').show();
    $('#cart-container').show();
    
    // Ensure model path is correctly formatted
    let fullModelPath = modelPath;
    if (!fullModelPath.startsWith('models/')) {
      fullModelPath = 'models/' + fullModelPath;
    }
    if (!fullModelPath.endsWith('.stl')) {
      fullModelPath = fullModelPath + '.stl';
    }
    
    // Set current model path
    currentModelPath = fullModelPath;
    
    // IMPORTANT: Set slider values BEFORE loading model
    $('#height-slider').val(heightValue);
    $('#width-slider').val(widthValue);
    $('#height-value').text(heightValue + ' ס"מ');
    $('#width-value').text(widthValue + ' ס"מ');
    
    // Select color
    $('.color-box').removeClass('selected');
    $(`.color-box[data-color="${color}"]`).addClass('selected');
    
    // Select texture
    $('#texture-select').val(texture);
    
    // Now load the model with our values already set
    if (!scene || !renderer) {
      init3DModel();
    } else {
      loadSTLModel(fullModelPath);
    }
    
    // Apply further updates after model is loaded
    setTimeout(function() {
      // Update camera and scale
      updateModelScaleAndCamera();
      
      // Set color again to ensure it's applied
      if (potMesh) {
        potMesh.material.color.set(color);
      }
      
      // Update price
      const price = (heightValue + widthValue) * 2;
      $('#price-display').text('המחיר: ' + price + ' ש"ח');
    }, 500);
    
    // הודעה למשתמש שהוא יכול לערוך ולהוסיף לעגלה
    const notification = $('<div class="design-notification">פרטי המוצר הוטענו! כעת ניתן לערוך ולהוסיף לעגלה</div>');
    $('body').append(notification);

    notification.css({
      'position': 'fixed',
      'top': '20px',
      'left': '50%',
      'transform': 'translateX(-50%)',
      'background-color': '#3498db',
      'color': 'white',
      'padding': '10px 20px',
      'border-radius': '30px',
      'font-weight': 'bold',
      'z-index': '10000',
      'box-shadow': '0 4px 12px rgba(0,0,0,0.2)',
      'opacity': '0'
    }).animate({
      'top': '30px',
      'opacity': '1'
    }, 500);

    // מסתירים את ההודעה אחרי 4 שניות
    setTimeout(() => {
      notification.animate({
        'top': '20px',
        'opacity': '0'
      }, 500, function() {
        $(this).remove();
      });
    }, 4000);

    // הדגשה חזותית של כפתור "הוסף לעגלה" כדי למשוך תשומת לב
    $('#add-to-cart').addClass('highlighted-btn');
    setTimeout(() => {
      $('#add-to-cart').removeClass('highlighted-btn');
    }, 2000);
  });
}

// פונקציה לעדכון כפוי של המימדים
function forceUpdateDimensions(height, width) {
  console.log("Force updating dimensions to:", height, "x", width);
  
  // עדכון ערכי סליידרים
  $('#height-slider').val(height);
  $('#width-slider').val(width);
  
  // עדכון טקסט ערכים
  $('#height-value').text(height + ' ס"מ');
  $('#width-value').text(width + ' ס"מ');
  
  // עדכון ישיר של משתנים גלובליים
  if (typeof currentHeight !== 'undefined') currentHeight = height;
  if (typeof currentWidth !== 'undefined') currentWidth = width;
  
  // הפעלת אירועי input
  $('#height-slider, #width-slider').trigger('input');
  
  // ניסיון להפעיל פונקציות עדכון ידועות
  if (typeof updateModelDimensions === 'function') {
    updateModelDimensions(height, width);
  }
  
  if (typeof updateModelScale === 'function') {
    updateModelScale();
  }
  
  if (typeof updateModelScaleAndCamera === 'function') {
    updateModelScaleAndCamera();
  }
  
  // עדכון מחיר
  const price = (parseInt(height) + parseInt(width)) * 2;
  $('#price-display').text('המחיר: ' + price + ' ש"ח');
}

// הוספת מאזין אירועים ללחיצה על כפתור "הזמן שוב"
$(document).on('click', '.reorder-btn', function() {
  const modelPath = $(this).data('model');
  const height = $(this).data('height');
  const width = $(this).data('width');
  const color = $(this).data('color');
  const texture = $(this).data('texture');
  
  reorderItem(modelPath, height, width, color, texture);
});

function freezeVaseMovement() {
  if (controls) controls.enabled = false;
}

function unfreezeVaseMovement() {
  if (controls) controls.enabled = true;
}


$(document).ready(function () {
    if (document.getElementById('ordersContainer')) {
        loadUserOrders();
    }

  // תיקון סגנון כפתורי "הזמן מוצר דומה" אם קיימים בעמוד
  setTimeout(function() {
    $('.reorder-btn').each(function() {
      if (!$(this).attr('id')) {
        $(this).attr('id', 'hzamn-mwhw-dwmh');
      }
      $(this).css({
        'display': 'block',
        'width': '80%',
        'margin': '15px auto 5px',
        'text-align': 'center',
        'border-radius': '30px'
      });
    });
  }, 500);

  // כפתורי ניווט
  $('#login-btn').click(login);
  
  $('#back-to-menu').click(function () {
    $('#personal-area').hide();
    $('#home-screen').show();
  });
  
  $('#back-to-cart').click(function () {
    $('#checkout-screen').hide();
    $('#design-screen').show();
    $('#cart-container').show();
    $('#cart-details').show();
    $('#floating-buttons').show();
    
    if (!scene || !renderer) {
      init3DModel();
    }
    
    $('#cart-icon').show();
    paypalRendered = false;
  });
  
  $('#back-to-form').click(function () {
    $('#paypal-button-container').hide();
    $('#back-to-form').hide();
    $('#order-form').show();
    paypalRendered = false;
  });
  
  $('#go-to-design').click(function () {
    $('#home-screen').hide();
    $('#design-screen').show();
    $('#cart-container').show();
      if (!scene || !renderer) {
    init3DModel();
  } else {
    // אם המודל כבר קיים, רק עדכן את המידות שלו
    updateModelScaleAndCamera();
  }
  });
  
  $('#go-to-orders').click(() => {
    $('#home-screen').hide();
    $('#personal-area').show();
    loadUserOrders();
  });
  
  $('#nav-home').click(() => {
    $('.container').hide();
    $('#cart-container').hide();
    $('#home-screen').show();
  });
  
$('#nav-logout').click(function() {
  // פשוט נסתיר/נציג את האלמנטים המתאימים
  $('.container').hide();
  $('#cart-container').hide();
  $('#floating-buttons').hide();
  $('#login-screen').show();
  resetCart();
  
  console.log("User logged out");
});
  
  // גלילה עם החצים
  $('.carousel-arrow.left').click(function () {
    $('#pot-gallery').scrollLeft($('#pot-gallery').scrollLeft() + 200);
  });
  
  $('.carousel-arrow.right').click(function () {
    $('#pot-gallery').scrollLeft($('#pot-gallery').scrollLeft() - 200);
  });
  
  // בחירת דגם
  $('.pot-option').click(function () {
    $('.pot-option').removeClass('selected');
    $(this).addClass('selected');
    
    const selectedPath = $(this).data('model');
    currentModelPath = selectedPath;
    loadSTLModel(selectedPath);
  });
  
  // עגלת קניות
  $('#height-slider, #width-slider').on('input', updateModelScaleAndCamera);
  
  $('.color-box').click(function () {
    $('.color-box').removeClass('selected');
    $(this).addClass('selected');
    const selectedColor = $(this).data('color');
    if (potMesh) {
      potMesh.material.color.set(selectedColor);
    }
  });
  
  $('#calculate-price').click(function () {
    const height = $('#height-slider').val();
    const width = $('#width-slider').val();
    const selectedColorBox = $('.color-box.selected');
    const texture = $('#texture-select').val();
    
    if (!selectedColorBox.length) {
      alert('אנא בחר צבע לפני חישוב מחיר.');
      return;
    }
    
    if (!texture) {
      alert('אנא בחר טקסטורה לפני חישוב מחיר.');
      return;
    }
    
    const price = (parseInt(height) + parseInt(width)) * 2;
    $('#price-display').text('המחיר: ' + price + ' ש"ח');
  });
  
    $('#add-to-cart').off('click').on('click', function() {
      addItemToCart();
    });
      
  $('#cart-icon').click(function () {
    $('#cart-details').toggle();
  });
  
  $('#continue-shopping').click(function () {
    $('#cart-details').hide();
  });
  
  $('#checkout, #order-now').click(function () {
    if (cartItems.length === 0) {
      alert('העגלה ריקה. אנא הוסף מוצר לפני ההזמנה.');
      return;
    }
    goToCheckout();
    fillOrderFormFromSession();
  });
  
  // הסרת פריט מהעגלה
  $(document).on('click', '.remove-item', function () {
    const li = $(this).closest('li');
    const itemId = parseInt(li.data('id'));
    
    const itemIndex = cartItems.findIndex(item => item.id === itemId);
    if (itemIndex !== -1) {
      totalPrice -= cartItems[itemIndex].price;
      cartItems.splice(itemIndex, 1);
    }
    
    li.remove();
    
    $('#total-price').text("סה\"כ: " + totalPrice + " ש\"ח");
    cartCount--;
    $('#cart-count').text(cartCount);
  });
  
    $('#take-photo').on('click', function () {
        console.log("📸 צלם תמונה נלחץ");
        freezeVaseMovement();              // מפסיק תנועה
        $(this).hide();                    // מסתיר את "צלם תמונה"
        $('#retake-photo').show();        // מציג את "צלם שוב"
    });
    
    $('#retake-photo').on('click', function () {
        console.log("🔄 צלם שוב נלחץ");
        unfreezeVaseMovement();           // מחזיר תנועה
        $(this).hide();                   // מסתיר את "צלם שוב"
        $('#take-photo').show();          // מחזיר את "צלם תמונה"
    });

  
    $('#order-form').submit(function(e) {
    e.preventDefault();
    
    // Check if cart is empty
    if (cartItems.length === 0) {
        alert('העגלה ריקה. אנא הוסף מוצר לפני ההזמנה.');
        return;
    }
    
    // Get form data
    const formData = $(this).serialize();
    console.log('נתוני טופס:', formData);
    
    // Calculate final total with shipping
    const selectedShipping = $('#shipping-type option:selected');
    const shippingCost = parseFloat(selectedShipping.data('price')) || 0;
    const finalTotal = totalPrice + shippingCost;
    
    // First save the order to the database
    $.ajax({
        url: '../php/submit_order.php',
        method: 'POST',
        data: {
            orderData: formData,
            cartItems: JSON.stringify(cartItems),
            total: finalTotal
        },
        success: function(response) {
            console.log("Order submission response:", response);
            
            if (response === "success") {
                // Order was saved successfully, now show PayPal
                $('#order-form').hide();
                $('#paypal-button-container').empty().show();
                $('#back-to-form').show();
                
                // ✅ סימולציית תשלום מוצלח ושליחת קובץ למדפסת
                if (cartItems.length > 0) {
                    const selectedModelPath = cartItems[0].model; // נניח שיש מוצר אחד בלבד
                    const modelFileName = selectedModelPath.split('/').pop();
                    
                    alert("✅ ההזמנה נשמרה בהצלחה\n🔁 הקובץ נשלח למדפסת.");
                    sendToBambuPrinter(selectedModelPath, modelFileName);
                }
                
                // Continue with PayPal
                if (!window.paypalRendered) {
                    window.paypalRendered = true;
                    
                    paypal.Buttons({
                        createOrder: function(data, actions) {
                            return actions.order.create({
                                purchase_units: [{
                                    amount: {
                                        value: finalTotal.toFixed(2)
                                    },
                                    description: 'הזמנה מ-SmartVase'
                                }]
                            });
                        },
                        onApprove: function(data, actions) {
                            return actions.order.capture().then(function(details) {
                                alert('תודה, ' + (details.payer.name ? details.payer.name.given_name : '') + '! ההזמנה בוצעה בהצלחה.');
                                cartItems = [];
                                cartCount = 0;
                                totalPrice = 0;
                                $('#cart-items').empty();
                                $('#cart-count').text('0');
                                $('#total-price').text('סה"כ: 0 ש"ח');
                                $('#paypal-button-container').empty();
                                $('#checkout-screen').hide();
                                $('#design-screen').show();
                                window.paypalRendered = false;
                            });
                        },
                        onCancel: function() {
                            alert('התשלום בוטל.');
                            window.paypalRendered = false;
                        },
                        onError: function(err) {
                            console.error('שגיאה בתשלום:', err);
                            alert('אירעה שגיאה במהלך התשלום.');
                            window.paypalRendered = false;
                        }
                    }).render('#paypal-button-container');
                }
            } else {
                console.error('Order submission error:', response);
                alert('שגיאה בשליחת ההזמנה: ' + response);
            }
        },
        error: function(xhr, status, error) {
            console.error('AJAX error:', status, error);
            alert('שגיאה בשליחת ההזמנה לשרת. אנא נסה שנית.');
        }
    });
});
  $('#shipping-type').change(updateFinalTotal);
  
  // עדכון טקסט של סלאידרים ביוזמת המשתמש
  updateModelScaleAndCamera();
  
    $('.pot-option').each(function () {
    if ($(this).data('model') === currentModelPath) {
      $(this).addClass('selected');
    } else {
      $(this).removeClass('selected');
    }
  });
  

// הוספת מאזין אירועים למקש Enter בשדות הקלט של דף ההתחברות
$('#username, #password').keypress(function(event) {
  // אם נלחץ מקש Enter (קוד 13)
  if (event.keyCode === 13) {
    // מונע את התנהגות ברירת המחדל של הדפדפן (שליחת טופס)
    event.preventDefault();
    // מפעיל את פונקציית ההתחברות
    login();
  }
});
});