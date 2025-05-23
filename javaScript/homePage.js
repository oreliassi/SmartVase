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
    const loader = new THREE.STLLoader();
  
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
  
        // עדכון טקסט של סלאידרים
        $('#height-value').text(height + ' ס"מ');
        $('#width-value').text(width + ' ס"מ');
      },
      undefined,
      function (error) {
        console.error('שגיאה בטעינת STL:', error);
      }
    );
  }
  
  function login() {
    const email = $('#username').val();
    const password = $('#password').val();

    if (email && password) {
        $.post('php/login.php', { email, password }, function (response) {
            if (response === 'success') {
                $('#login-screen').hide();
                $('#design-screen').show();
                $('#cart-container').show();
                init3DModel();
            } else {
                alert('אימייל או סיסמה שגויים.');
            }
        });
    } else {
        alert('נא למלא אימייל וסיסמה.');
    }
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
              cartCount++;
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
          return;
      }
  
      if (!texture) {
          alert('אנא בחר טקסטורה לפני הוספה לעגלה.');
          return;
      }
  
      const colorName = colorNames[color] || color;
      const price = (parseInt(height) + parseInt(width)) * 2;
  
      const item = {
          id: Date.now(), // מזהה ייחודי לפי זמן
          height,
          width,
          color,
          texture,
          price
      };
  
      cartItems.push(item);
      totalPrice += price;
  
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
  }
  
  
      $(document).ready(function () {
  
  
          // גלילה עם החצים
      $('.carousel-arrow.left').click(function () {
      $('#pot-gallery').scrollLeft($('#pot-gallery').scrollLeft() + 200);
      });
  
      $('.carousel-arrow.right').click(function () {
      $('#pot-gallery').scrollLeft($('#pot-gallery').scrollLeft() - 200);
      });;
  
      // בחירת דגם – מסמן עם outline
      $('.pot-option').click(function () {
      $('.pot-option').removeClass('selected');
      $(this).addClass('selected');
  
      const selectedPath = $(this).data('model');
      currentModelPath = selectedPath;
      loadSTLModel(selectedPath);
      });
  
  
          let currentModelPath = 'models/vase1.stl'; // ברירת מחדל
  
              $('.pot-option').click(function () {
                  const selectedPath = $(this).data('model');
                  currentModelPath = selectedPath;
                  loadSTLModel(selectedPath);
              });
  
              const updateSliderValues = () => {
                  $('#height-value').text($('#height-slider').val() + ' ס"מ');
                  $('#width-value').text($('#width-slider').val() + ' ס"מ');
              };
  
              $('#choose-pot').click(function () {
                  $('#pot-gallery').toggle();
                  $('#pot-gallery').html('<img src="pot1.jpg" width="100"><img src="pot2.jpg" width="100">');
              });
  
              $('.color-box').click(function () {
                  $('.color-box').removeClass('selected');
                  $(this).addClass('selected');
                  const selectedColor = $(this).data('color');
                  if (potMesh) {
                      potMesh.material.color.set(selectedColor);
                  }
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
              

              $('#height-slider, #width-slider').on('input', updateModelScaleAndCamera);
              
              
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
  
  
              $('#order-now').click(function () {
                  alert('טופס הזמנה יופיע כאן');
              });
  
              $('#add-to-cart').click(function () {
                  addItemToCart();
                  alert('הכד נוסף לעגלה');
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
  

              updateSliderValues();
          });
  
          function getTextureName(value) {
      switch (value) {
          case 'smooth': return 'חלק';
          case 'rough': return 'מחוספס';
          case 'matte': return 'מט';
          default: return value;
      }
  }
  function goToCheckout() {
              $('#design-screen').hide();
              $('#cart-container').hide(); // מסתיר את עגלת הקניות
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
  
          $('#shipping-type').change(updateFinalTotal);
  
          $('#order-now, #checkout').click(function () {
              if (cartItems.length === 0) {
                  alert('העגלה ריקה. אנא הוסף מוצר לפני ההזמנה.');
                  return;
              }
              goToCheckout();
          });
  
          $('#order-form').submit(function(e) {
              e.preventDefault();
              const formData = $(this).serializeArray();
              console.log('נתוני טופס:', formData);
  
              const selectedShipping = $('#shipping-type option:selected');
              const shippingCost = parseFloat(selectedShipping.data('price')) || 0;
              const finalTotal = totalPrice + shippingCost;
  
              $('#order-form').hide();
              $('#paypal-button-container').empty().show();
  
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
                              alert('תודה, ' + details.payer.name.given_name + '! ההזמנה בוצעה בהצלחה.');
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
          });
      
          