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
let isProcessingOrder = false;
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
  const height = parseFloat($('#height-slider').val());
  const width = parseFloat($('#width-slider').val());
  const selectedColorBox = $('.color-box.selected');
  const selectedColor = selectedColorBox.length > 0 ? selectedColorBox.data('color') : "#f14a4a";

  loader.load(
    modelPath,
    function (geometry) {
      geometry.computeBoundingBox();
      geometry.center();

      const material = new THREE.MeshStandardMaterial({
        color: new THREE.Color(selectedColor),
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

      const box = new THREE.Box3().setFromObject(potMesh);
      const size = new THREE.Vector3();
      box.getSize(size);
      const center = new THREE.Vector3();
      box.getCenter(center);

      const modelHeight = size.z;
      const modelWidth = (size.x + size.y) / 2;

      potMesh.userData.originalHeight = modelHeight;
      potMesh.userData.originalWidth = modelWidth;

      const scaleZ = height / modelHeight;
      const scaleXY = width / modelWidth;
      potMesh.scale.set(scaleXY, scaleXY, scaleZ);

      scene.add(potMesh);

      potMesh.updateMatrixWorld(true);
      const updatedBox = new THREE.Box3().setFromObject(potMesh);
      const newCenter = new THREE.Vector3();
      updatedBox.getCenter(newCenter);
      controls.target.copy(newCenter);

      const updatedSize = new THREE.Vector3();
      updatedBox.getSize(updatedSize);
      const maxSize = Math.max(updatedSize.x, updatedSize.y, updatedSize.z);
      const fov = camera.fov * (Math.PI / 180);
      const distance = (maxSize / 2) / Math.tan(fov / 2);
      const cameraBackFactor = 2.8;
      camera.position.copy(newCenter.clone().add(new THREE.Vector3(0, 0, distance * cameraBackFactor)));

      controls.update();

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

      $('#height-value').text(height + ' ס"מ');
      $('#width-value').text(width + ' ס"מ');
      
        $('.ar-loading').hide();
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
  
async function addItemToCart() {
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
    const originalText = $('#add-to-cart').text();
    $('#add-to-cart').prop('disabled', true).text('בודק זמינות...');

    try {
        if (!window.simpleOdooClient.materialsLoaded) {
            let waitTime = 0;
            while (!window.simpleOdooClient.materialsLoaded && waitTime < 5000) {
                await new Promise(resolve => setTimeout(resolve, 100));
                waitTime += 100;
            }
            
            if (!window.simpleOdooClient.materialsLoaded) {
                alert('לא ניתן לטעון חומרים מהמערכת. אנא נסה שוב.');
                return false;
            }
        }
        const priceData = await window.simpleOdooClient.calculatePrice(height, width, color, texture);
        
        if (!priceData) {
            alert('לא ניתן לחשב מחיר עבור הבחירות הנוכחיות');
            return false;
        }
        
        const availability = await window.simpleOdooClient.checkMaterialAvailability(
            color, texture, priceData.weightGrams || 0
        );

        if (!availability.available) {
            alert('החומר הנבחר אינו זמין במלאי כרגע. אנא בחר צבע או טקסטורה אחרים.');
            return false;
        }

        const colorName = colorNames[color] || color;
        const item = {
            id: Date.now(),
            height: parseInt(height),
            width: parseInt(width),
            color,
            colorName,
            texture,
            price: priceData.price,
            model: currentModelPath
        };

        cartItems.push(item);
        totalPrice += priceData.price;
        cartCount++;

        const listItem = `
            <li data-id="${item.id}">
                <span style="float:left; color: red; cursor: pointer;" class="remove-item">✖</span>
                <div class="cart-item-details">
                    <div class="cart-item-main">כד ${height}×${width} ס"מ</div>
                    <div class="cart-item-sub">צבע: ${colorName}</div>
                    <div class="cart-item-sub">טקסטורה: ${getTextureName(texture)}</div>
                    <div class="cart-item-price">מחיר: ${priceData.price} ש"ח</div>
                </div>
            </li>
        `;

        $('#cart-items').append(listItem);
        $('#total-price').text("סה\"כ: " + Math.round(totalPrice * 100) / 100 + " ש\"ח");
        updateCartDisplay();

        const successMsg = $(`
            <div class="stock-success">
                <div class="success-icon">✅</div>
                <div class="success-text">הכד נוסף לעגלה בהצלחה!</div>
            </div>
        `);
        
        $('body').append(successMsg);
        successMsg.fadeIn(300).delay(2500).fadeOut(300, function() {
            $(this).remove();
        });

        performFlyingAnimation(color);

        return true;

    } catch (error) {
        console.error('Error adding to cart:', error);
        alert('שגיאה בהוספה לעגלה. אנא נסה שוב.');
        return false;
    } finally {
        $('#add-to-cart').prop('disabled', false).text(originalText);
    }
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

function updateModelScaleAndCamera() {
  const height = parseFloat($('#height-slider').val());
  const width = parseFloat($('#width-slider').val());

  if (potMesh && potMesh.userData.originalHeight && potMesh.userData.originalWidth) {
    const scaleZ = height / potMesh.userData.originalHeight;
    const scaleXY = width / potMesh.userData.originalWidth;

    potMesh.scale.set(scaleXY, scaleXY, scaleZ);
    potMesh.updateMatrixWorld(true);

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

function performFlyingAnimation(color) {
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
        opacity: 1
    });
    
    $('body').append(flyingItem);
    
    flyingItem.animate({
        width: '75px', 
        height: '75px'
    }, 150, function() {
        $(this).animate({
            width: '70px',
            height: '70px'
        }, 150, function() {
            $(this).animate({
                top: startPosition.top - 150
            }, 300, 'easeOutQuad', function () {
                $(this).animate({
                    left: cartIconPosition.left - 15,
                    top: cartIconPosition.top - 15,
                    width: '30px',
                    height: '30px'
                }, 500, 'easeInQuad', function () {
                    const shine = $('<div class="cart-shine"></div>');
                    $('#cart-icon').append(shine);
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
                    
                    flyingItem.remove();
                    $('#cart-details').show();
                });
            });
        });
    });
    
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
}

function renderPayPalButton(finalTotal, orderData, preOrderId) {
    if (!document.getElementById('paypal-button-container')) {
        console.error("⚠️ האלמנט paypal-button-container לא קיים או הוסר מה-DOM!");
        return;
    }
    console.log("🎯 Rendering PayPal button for amount:", finalTotal, "ILS");
    
    $('#paypal-button-container').empty();
    
    const USD_RATE = 0.27;
    const amountUSD = (finalTotal * USD_RATE).toFixed(2);

    console.log("💱 Converting", finalTotal, "ILS to", amountUSD, "USD for PayPal");
    
    if (typeof paypal === 'undefined') {
        console.error("PayPal SDK not loaded!");
        alert('שגיאה בטעינת מערכת התשלומים. אנא רענן את הדף ונסה שוב.');
        return;
    }
    
    try {
        paypal.Buttons({
            createOrder: function(data, actions) {
                console.log("💰 Creating PayPal order for USD:", amountUSD);
                
                return actions.order.create({
                    purchase_units: [{
                        amount: {
                            value: amountUSD,
                            currency_code: 'USD'
                        },
                        description: `SmartVase Order - ${cartItems.length} כדים מותאמים אישית`,
                        custom_id: preOrderId,
                        invoice_id: preOrderId + '_' + Date.now()
                    }],
                    application_context: {
                        brand_name: 'SmartVase',
                        locale: 'he-IL',
                        user_action: 'PAY_NOW',
                        shipping_preference: 'NO_SHIPPING'
                    }
                });
            },
            
            onApprove: function(data, actions) {
                console.log("✅ PayPal payment approved:", data);
                
                const processingOverlay = $(`
                    <div id="payment-processing-overlay" style="
                        position: fixed; top: 0; left: 0; width: 100%; height: 100%; 
                        background: rgba(0,0,0,0.8); z-index: 10000; 
                        display: flex; align-items: center; justify-content: center; 
                        flex-direction: column; color: white;
                    ">
                        <div class="spinner" style="
                            border: 4px solid #f3f3f3; border-top: 4px solid #3498db; 
                            border-radius: 50%; width: 40px; height: 40px; 
                            animation: spin 2s linear infinite; margin-bottom: 20px;
                        "></div>
                        <p style="font-size: 18px;">מעבד את התשלום...</p>
                    </div>
                    <style>
                        @keyframes spin {
                            0% { transform: rotate(0deg); }
                            100% { transform: rotate(360deg); }
                        }
                    </style>
                `);
                $('body').append(processingOverlay);
                
                return actions.order.capture().then(function(details) {
                    console.log("💳 Payment captured successfully:", details);
                    
                    $('#payment-processing-overlay').remove();
                    
                    console.log("📝 School project - payment completed successfully");
                    showPaymentSuccess(details, preOrderId, finalTotal);
                    
                }).catch(function(error) {
                    console.error("❌ Payment capture failed:", error);
                    $('#payment-processing-overlay').remove();
                    alert('שגיאה בעיבוד התשלום. אנא נסה שוב או צור קשר עם התמיכה.');
                });
            },
            
            onCancel: function(data) {
                console.log("❌ PayPal payment cancelled:", data);
                alert('התשלום בוטל על ידך. ההזמנה נשמרה ותוכל לחזור ולשלם מאוחר יותר.');
                
                $('#order-form').show();
                $('#paypal-button-container').hide();
                $('#back-to-form').hide();
                paypalRendered = false;
            },
            
            onError: function(err) {
                console.error("💥 PayPal error:", err);
                alert('אירעה שגיאה במערכת התשלומים. אנא נסה שוב מאוחר יותר או צור קשר עם התמיכה.');
                
                $('#order-form').show();
                $('#paypal-button-container').hide();
                $('#back-to-form').hide();
                paypalRendered = false;
            },
            
            style: {
                layout: 'vertical',
                color: 'gold',
                shape: 'pill',
                label: 'paypal',
                height: 45,
                tagline: false
            }
            
        }).render('#paypal-button-container').then(function() {
            console.log("🎨 PayPal button rendered successfully");
        }).catch(function(error) {
            console.error("Failed to render PayPal button:", error);
            alert('שגיאה בטעינת כפתור התשלום. אנא רענן את הדף ונסה שוב.');
            
            $('#order-form').show();
            $('#paypal-button-container').hide();
            $('#back-to-form').hide();
            paypalRendered = false;
        });
        
    } catch (error) {
        console.error("Error setting up PayPal buttons:", error);
        alert('שגיאה בהגדרת מערכת התשלומים. אנא רענן את הדף ונסה שוב.');
        
        $('#order-form').show();
        $('#paypal-button-container').hide();
        $('#back-to-form').hide();
        paypalRendered = false;
    }
}
$(document).ready(function() {
  $('#order-form').submit(async function(e) {
    e.preventDefault();

    if (isProcessingOrder) return;
    isProcessingOrder = true;

    console.log("🔍 Form submission started for PayPal integration");

    if (cartItems.length === 0) {
      alert('העגלה ריקה. אנא הוסף מוצר לפני ההזמנה.');
      isProcessingOrder = false;
      return;
    }

    console.log("🚀 Processing order for PayPal payment...");

    const loadingOverlay = $(`
      <div id="loading-overlay" style="
          position: fixed; top: 0; left: 0; width: 100%; height: 100%; 
          background: rgba(0,0,0,0.8); z-index: 10000; 
          display: flex; align-items: center; justify-content: center; 
          flex-direction: column; color: white;
      ">
          <div class="spinner" style="
              border: 4px solid #f3f3f3; border-top: 4px solid #3498db; 
              border-radius: 50%; width: 40px; height: 40px; 
              animation: spin 2s linear infinite; margin-bottom: 20px;
          "></div>
          <p>מכין את ההזמנה לתשלום...</p>
      </div>
    `);
    $('body').append(loadingOverlay);

    const firstName = $('input[name="first_name"]').val();
    const lastName = $('input[name="last_name"]').val();
    const email = $('input[name="email"]').val();
    const phone = $('input[name="phone"]').val();
    const city = $('input[name="city"]').val();
    const street = $('input[name="street"]').val();
    const apartment = $('input[name="apartment"]').val();
    const shippingValue = $('#shipping-type').val();
    const shippingCost = parseFloat($('#shipping-type option:selected').data('price')) || 0;
    const finalTotal = totalPrice + shippingCost;

    if (!firstName || !lastName || !email || !phone) {
      alert('אנא מלא את כל השדות הנדרשים: שם פרטי, שם משפחה, אימייל וטלפון');
      $('#loading-overlay').remove();
      isProcessingOrder = false;
      return;
    }

    const preOrderId = 'PRE_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);

    const orderData = {
      first_name: firstName,
      last_name: lastName,
      email: email,
      phone: phone,
      city: city || '',
      street: street || '',
      apartment: apartment || '',
      shipping: shippingValue || 'regular',
      cartItems: JSON.stringify(cartItems),
      total: finalTotal,
      payment_status: 'pending',
      paypal_order_id: preOrderId
    };

    try {
      console.log("💾 Saving order to database with pending status...");

      const dbResponse = await $.ajax({
        url: '../php/submit_order.php',
        method: 'POST',
        data: orderData,
        timeout: 30000
      });

      console.log("📥 Database response:", dbResponse);

      if (dbResponse !== "success") {
        throw new Error('Database save failed: ' + dbResponse);
      }

      console.log("✅ Order saved to database with pending status");

      $('#loading-overlay').remove();
      $('#order-form').hide();
      $('#paypal-button-container').show();
      $('#back-to-form').show();

      if (typeof updateInventoryAfterConfirmation === 'function') {
        console.log("📦 Updating inventory after order confirmation...");
        try {
          await updateInventoryAfterConfirmation();
        } catch (error) {
          console.log("📦 Inventory update skipped for school project");
        }
      }
      renderPayPalButton(finalTotal, orderData, preOrderId);

    } catch (error) {
      $('#loading-overlay').remove();

      console.error('❌ Order processing error:', error);

      let errorMessage = 'שגיאה בעיבוד ההזמנה: ';
      if (error.message.includes('timeout')) {
        errorMessage += 'תם הזמן הקצוב לעיבוד. אנא נסה שוב.';
      } else {
        errorMessage += error.message;
      }

      alert(errorMessage);
      $('#order-form').show();

    } finally {
      isProcessingOrder = false;
    }
  });
});

function updatePaymentStatus(preOrderId, paypalOrderId, paypalDetails) {
    return new Promise((resolve, reject) => {
        $.post('../php/update_payment_status.php', {
            pre_order_id: preOrderId,
            paypal_order_id: paypalOrderId,
            payment_status: 'completed',
            paypal_details: JSON.stringify(paypalDetails)
        })
        .done(function(response) {
            try {
                const result = typeof response === 'string' ? JSON.parse(response) : response;
                resolve(result);
            } catch (error) {
                resolve({ success: response === "success", message: response });
            }
        })
        .fail(function(xhr, status, error) {
            console.error("Payment status update failed:", error);
            resolve({ success: false, error: error });
        });
    });
}

function showPaymentSuccess(paypalDetails, preOrderId, finalTotal) {
    $('#checkout-screen').hide();
    
    const successMessage = $(`
        <div class="payment-success-modal" style="
            position: fixed; top: 0; left: 0; width: 100%; height: 100%; 
            background: rgba(0,0,0,0.9); z-index: 10000; 
            display: flex; align-items: center; justify-content: center;
        ">
            <div class="success-content" style="
                background: white; padding: 30px; border-radius: 15px; 
                max-width: 500px; width: 90%; text-align: center; 
                box-shadow: 0 10px 30px rgba(0,0,0,0.3);
            ">
                <div class="success-header" style="margin-bottom: 20px;">
                    <i class="fas fa-check-circle" style="color: #27ae60; font-size: 60px; margin-bottom: 15px;"></i>
                    <h3 style="color: #27ae60; margin: 0;">התשלום בוצע בהצלחה!</h3>
                </div>
                <div class="payment-details" style="text-align: right; background: #f8f9fa; padding: 20px; border-radius: 10px; margin: 20px 0;">
                    <p><strong>מספר הזמנה:</strong> ${preOrderId}</p>
                    <p><strong>סכום ששולם:</strong> ${finalTotal} ש"ח</p>
                    <p><strong>מספר עסקה PayPal:</strong> ${paypalDetails.id}</p>
                    <p><strong>שם הלקוח:</strong> ${paypalDetails.payer.name.given_name} ${paypalDetails.payer.name.surname || ''}</p>
                    <p><strong>אימייל:</strong> ${paypalDetails.payer.email_address}</p>
                    <p><strong>סטטוס:</strong> <span style="color: #27ae60;">✅ שולם במלואו</span></p>
                </div>
                <div class="order-summary" style="text-align: right; margin: 20px 0;">
                    <h4>פריטים שהוזמנו:</h4>
                    <ul class="ordered-items" style="list-style: none; padding: 0;">
                        ${cartItems.map(item => `
                            <li style="background: #e9ecef; margin: 5px 0; padding: 10px; border-radius: 5px;">
                                כד ${item.height}×${item.width} ס"מ - ${item.colorName} - ${getTextureName(item.texture)} - ${item.price} ש"ח
                            </li>
                        `).join('')}
                    </ul>
                </div>
                <div class="next-steps" style="text-align: right; background: #e7f3ff; padding: 15px; border-radius: 10px; margin: 20px 0;">
                    <h4>השלבים הבאים:</h4>
                    <p>✅ ההזמנה נקלטה במערכת</p>
                    <p>✅ המלאי עודכן</p>
                    <p>🔄 המוצר יתחיל להיות מיוצר</p>
                    <p>📧 תקבל עדכונים למייל</p>
                    <p>🚚 המוצר יישלח בהתאם לסוג המשלוח שנבחר</p>
                </div>
                <button id="back-to-main-after-payment" style="
                    background: #3498db; color: white; border: none; 
                    padding: 15px 30px; border-radius: 25px; font-size: 16px; 
                    cursor: pointer; margin-top: 20px;
                ">חזור לעמוד הראשי</button>
            </div>
        </div>
    `);
    
    $('body').append(successMessage);
    $('#back-to-main-after-payment').click(function() {
        resetCart();
        $('.payment-success-modal').remove();
        $('#checkout-screen').hide();
        $('#design-screen').show();
        $('#cart-container').show();
    });
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
        const orderDate = new Date(order.date);
        const formattedDate = orderDate.toLocaleDateString('he-IL', {
          year: 'numeric',
          month: 'numeric',
          day: 'numeric'
        });
        
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
      let orderDetails;
      if (typeof response === 'string') {
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
      
      const shippingText = orderDetails.shipping ? getShippingText(orderDetails.shipping) : 'רגיל';
      const price = orderDetails.price ? `${orderDetails.price} ש"ח` : 'לא זמין';
      const statusText = orderDetails.status ? getStatusText(orderDetails.status) : 'בטיפול';
      const city = orderDetails.city || '';
      const street = orderDetails.street || '';
      const apartment = orderDetails.apartment || '';
      const address = [city, street, apartment].filter(Boolean).join(', ') || 'לא צוין';
      const orderDate = orderDetails.date ? new Date(orderDetails.date) : new Date();
      const formattedDate = orderDate.toLocaleDateString('he-IL', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
      
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
          const modelHeight = model.height || 'לא צוין';
          const modelWidth = model.width || 'לא צוין';
          const modelColor = model.color || '#aaaaaa';
          const modelTexture = model.texture || 'חלק';
          const colorName = colorNames[modelColor] || modelColor;
          const colorStyle = `background-color: ${modelColor}; display: inline-block; width: 15px; height: 15px; border-radius: 50%; margin-right: 5px; vertical-align: middle;`;
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
                  <i class="fas fa-edit"></i> הזמן שוב מוצר זה
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
      
      $('body').append(detailsHtml);
            $('.modal-content').css('opacity', '0').animate({
        opacity: 1
      }, 300);
      
      $('.close-modal').click(function() {
        $('.modal-content').animate({
          opacity: 0
        }, 300, function() {
          $('.order-details-modal').remove();
        });
      });
      
      $('.order-details-modal').click(function(e) {
        if ($(e.target).hasClass('order-details-modal')) {
          $('.modal-content').animate({
            opacity: 0
          }, 300, function() {
            $('.order-details-modal').remove();
          });
        }
      });
      
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

        const blendFactor = 0.6;
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
  
  const heightValue = parseInt(height);
  const widthValue = parseInt(width);
  
  $('.modal-content').animate({
    opacity: 0
  }, 300, function() {
    $('.order-details-modal').remove();
    
    $('#personal-area').hide();
    $('#design-screen').show();
    $('#cart-container').show();
    
    let fullModelPath = modelPath;
    if (!fullModelPath.startsWith('models/')) {
      fullModelPath = 'models/' + fullModelPath;
    }
    if (!fullModelPath.endsWith('.stl')) {
      fullModelPath = fullModelPath + '.stl';
    }
    
    currentModelPath = fullModelPath;
    
    $('#height-slider').val(heightValue);
    $('#width-slider').val(widthValue);
    $('#height-value').text(heightValue + ' ס"מ');
    $('#width-value').text(widthValue + ' ס"מ');
    
    $('.color-box').removeClass('selected');
    $(`.color-box[data-color="${color}"]`).addClass('selected');
    
    $('#texture-select').val(texture);
    
    if (!scene || !renderer) {
      init3DModel();
    } else {
      loadSTLModel(fullModelPath);
    }
    
    setTimeout(function() {
      updateModelScaleAndCamera();
      if (potMesh) {
        potMesh.material.color.set(color);
      }
      
      const price = (heightValue + widthValue) * 2;
      $('#price-display').text('המחיר: ' + price + ' ש"ח');
    }, 500);
    
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

    setTimeout(() => {
      notification.animate({
        'top': '20px',
        'opacity': '0'
      }, 500, function() {
        $(this).remove();
      });
    }, 4000);

    $('#add-to-cart').addClass('highlighted-btn');
    setTimeout(() => {
      $('#add-to-cart').removeClass('highlighted-btn');
    }, 2000);
  });
}

function forceUpdateDimensions(height, width) {
  console.log("Force updating dimensions to:", height, "x", width);
  
  $('#height-slider').val(height);
  $('#width-slider').val(width);
  $('#height-value').text(height + ' ס"מ');
  $('#width-value').text(width + ' ס"מ');
  
  if (typeof currentHeight !== 'undefined') currentHeight = height;
  if (typeof currentWidth !== 'undefined') currentWidth = width;
  
  $('#height-slider, #width-slider').trigger('input');
  
  if (typeof updateModelDimensions === 'function') {
    updateModelDimensions(height, width);
  }
  
  if (typeof updateModelScale === 'function') {
    updateModelScale();
  }
  
  if (typeof updateModelScaleAndCamera === 'function') {
    updateModelScaleAndCamera();
  }
  
  const price = (parseInt(height) + parseInt(width)) * 2;
  $('#price-display').text('המחיר: ' + price + ' ש"ח');
}

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

function updateInventoryAfterConfirmation() {
    return new Promise((resolve, reject) => {
        console.log("📦 Updating inventory after order confirmation (before payment)");
        
        $.post('../php/update_odoo_inventory.php', {
            cartItems: JSON.stringify(cartItems)
        }, function(response) {
            console.log("📦 Inventory update response:", response);
            
            try {
                const result = typeof response === 'string' ? JSON.parse(response) : response;
                if (result.success) {
                    console.log("✅ Inventory updated successfully:", result.updates);
                    resolve(result);
                } else {
                    console.warn("⚠️ Inventory update had issues:", result.errors);
                    resolve(result);
                }
            } catch (error) {
                console.error("📦 Error parsing inventory response:", error);
                resolve({ success: false, error: error.message });
            }
        }).fail(function(xhr, status, error) {
            console.error("📦 Inventory update failed:", error);
            resolve({ success: false, error: error });
        });
    });
}

$(document).ready(function () {
    if (document.getElementById('ordersContainer')) {
        loadUserOrders();
    }

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
  $('.container').hide();
  $('#cart-container').hide();
  $('#floating-buttons').hide();
  $('#login-screen').show();
  resetCart();
  
  console.log("User logged out");
});
  
  $('.carousel-arrow.left').click(function () {
    $('#pot-gallery').scrollLeft($('#pot-gallery').scrollLeft() + 200);
  });
  
  $('.carousel-arrow.right').click(function () {
    $('#pot-gallery').scrollLeft($('#pot-gallery').scrollLeft() - 200);
  });
  
  $('.pot-option').click(function () {
    $('.pot-option').removeClass('selected');
    $(this).addClass('selected');
    
    const selectedPath = $(this).data('model');
    currentModelPath = selectedPath;
    loadSTLModel(selectedPath);
  });
  
  $('#height-slider, #width-slider').on('input', updateModelScaleAndCamera);
  
  $('.color-box').click(function () {
    $('.color-box').removeClass('selected');
    $(this).addClass('selected');
    const selectedColor = $(this).data('color');
    if (potMesh) {
      potMesh.material.color.set(selectedColor);
    }
  });
  
  $('#calculate-price').off('click').on('click', async function () {
    const height = $('#height-slider').val();
    const width = $('#width-slider').val();
    const selectedColorBox = $('.color-box.selected');
    const color = selectedColorBox.data('color');
    const texture = $('#texture-select').val();
    
    if (!selectedColorBox.length) {
        alert('אנא בחר צבע לפני חישוב מחיר.');
        return;
    }
    
    if (!texture) {
        alert('אנא בחר טקסטורה לפני חישוב מחיר.');
        return;
    }
    
    // Show loading state
    const originalText = $(this).text();
    $(this).prop('disabled', true).text('מחשב...');
    $('#price-display').html('<div class="price-loading">מחשב מחיר...</div>');
    
    try {
        if (!window.simpleOdooClient.materialsLoaded) {
            $('#price-display').html('טוען חומרים מהמערכת...');
            let waitTime = 0;
            while (!window.simpleOdooClient.materialsLoaded && waitTime < 5000) {
                await new Promise(resolve => setTimeout(resolve, 100));
                waitTime += 100;
            }
        }
        
        const priceData = await window.simpleOdooClient.calculatePrice(height, width, color, texture);
        
        if (priceData) {
            const availability = await window.simpleOdooClient.checkMaterialAvailability(
                color, texture, 0
            );
            
            let displayHTML = `
                <div class="price-result">
                    <div class="price-main">המחיר: <strong>${priceData.price} ש"ח</strong></div>
            `;
            
            if (availability.available) {
                displayHTML += `<div class="price-availability available">✅ זמין להזמנה</div>`;
            } else {
                displayHTML += `<div class="price-availability unavailable">❌ אינו זמין כרגע</div>`;
            }
            
            displayHTML += '</div>';
            
            $('#price-display').html(displayHTML);
        } else {
            $('#price-display').html('<div class="price-error">לא ניתן לחשב מחיר - אנא ודא שבחרת צבע וטקסטורה נתמכים</div>');
        }
    } catch (error) {
        console.error('Error calculating price:', error);
        $('#price-display').html('<div class="price-error">שגיאה בחישוב מחיר. אנא נסה שוב.</div>');
    } finally {
        $(this).prop('disabled', false).text(originalText);
    }
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
        freezeVaseMovement();       
        $(this).hide();
        $('#retake-photo').show();
    });
    
    $('#retake-photo').on('click', function () {
        console.log("🔄 צלם שוב נלחץ");
        unfreezeVaseMovement();
        $(this).hide();
        $('#take-photo').show();
    });
  $('#shipping-type').change(updateFinalTotal);
  updateModelScaleAndCamera();
    $('.pot-option').each(function () {
    if ($(this).data('model') === currentModelPath) {
      $(this).addClass('selected');
    } else {
      $(this).removeClass('selected');
    }
  });
  
$('#username, #password').keypress(function(event) {
  if (event.keyCode === 13) {
    event.preventDefault();
    login();
  }
});
});