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

            // ברירת מחדל חדשה בכל טעינה
            $('#height-slider').val(15);
            $('#width-slider').val(15);

            const material = new THREE.MeshStandardMaterial({
                color: new THREE.Color("#f14a4a"),
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

            // גובה ורוחב ברירת מחדל – מהסלאידרים
            const height = parseFloat($('#height-slider').val());
            const width = parseFloat($('#width-slider').val());

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

            // קרקע
            const ground = new THREE.Mesh(
                new THREE.PlaneGeometry(200, 200),
                new THREE.ShadowMaterial({ opacity: 0.15 })
            );
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

    return true;
}

function login() {
    const user = $('#username').val();
    const pass = $('#password').val();

    if (!user || !pass) {
        alert("נא למלא שם משתמש וסיסמה.");
        return;
    }

    $.post("../php/login.php", { email: user, password: pass }, function (response) {
        if (response === "success") {
            $('#login-screen').hide();
            $('#home-screen').show();
            $('#floating-buttons').show();
        } else {
            alert("שם משתמש או סיסמה שגויים");
        }
    }).fail(function (xhr, status, error) {
        console.error("POST failed:", error);
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
                const formData = $('#order-form').serializeArray();

                // מקבץ את המזהים של המודלים להזמנה
                const modelIds = cartItems.map(item => {
                    return {
                        model: item.model,
                        height: item.height,
                        width: item.width,
                        color: item.color,
                        texture: item.texture
                    };
                });

                // שליחת הזמנה לשרת
                $.ajax({
                    url: 'php/submit_order.php',
                    method: 'POST',
                    data: {
                        orderData: formData,
                        cartItems: JSON.stringify(cartItems),
                        total: finalTotal
                    },
                    success: function (response) {
                        if (response === "success") {
                            alert('תודה, ההזמנה בוצעה בהצלחה!');
                            // איפוס עגלה
                            resetCart();
                            $('#checkout-screen').hide();
                            $('#design-screen').show();
                        } else {
                            alert('שגיאה בשליחת ההזמנה: ' + response);
                        }
                    },
                    error: function () {
                        alert('שגיאה בשליחת ההזמנה לשרת');
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
    $('#ordersContainer').html('<p>טוען הזמנות...</p>');

    $.get("../php/login.php?getOrders=1", function (response) {
        try {
            const orders = typeof response === 'string' ? JSON.parse(response) : response;


            if (orders.length === 0) {
                $('#ordersContainer').html('<p>אין הזמנות קודמות.</p>');
                return;
            }

            let ordersHtml = '<div class="orders-container">';

            orders.forEach(order => {
                let orderDate = new Date(order.date).toLocaleDateString('he-IL');

                ordersHtml += `
          <div class="order-item">
            <h3>הזמנה #${order.order_number} - ${orderDate}</h3>
            <p>כתובת: ${order.city}, ${order.street} ${order.apartment}</p>
            <p>סוג משלוח: ${getShippingText(order.shipping)}</p>
            <p>סכום: ${order.price} ש"ח</p>
            <button class="order-details-btn" data-id="${order.order_number}">הצג פרטים</button>
          </div>
        `;
            });

            ordersHtml += '</div>';
            $('#ordersContainer').html(ordersHtml);

            // הוספת אירועי לחיצה על כפתורי פרטים
            $('.order-details-btn').click(function () {
                const orderId = $(this).data('id');
                showOrderDetails(orderId);
            });

        } catch (e) {
            console.error("Error parsing orders:", e, "Original response:", response);
            $('#ordersContainer').html('<p>שגיאה בטעינת הזמנות. אנא נסה שנית.</p>');
        }
    }).fail(function (xhr, status, error) {
        console.error("AJAX error:", status, error);
        $('#ordersContainer').html('<p>שגיאה בטעינת הזמנות. אנא נסה שנית.</p>');
    });
}

function getStatusText(status) {
    switch (status) {
        case 'pending': return 'ממתין לאישור';
        case 'confirmed': return 'אושר';
        case 'shipped': return 'נשלח';
        case 'delivered': return 'נמסר';
        default: return status;
    }
}

function getShippingText(shipping) {
    switch (shipping) {
        case 'regular': return 'משלוח רגיל';
        case 'express': return 'שליח עד הבית';
        case 'pickup': return 'איסוף עצמי';
        default: return shipping;
    }
}

function showOrderDetails(orderId) {
    // קריאה לנקודת הקצה החדשה שיצרנו
    $.get(`../php/login.php?getOrderDetails=${orderId}`, function (response) {
        try {
            const orderDetails = typeof response === 'string' ? JSON.parse(response) : response;

            if (!orderDetails || orderDetails.error) {
                alert('לא נמצאו פרטים עבור הזמנה זו');
                return;
            }

            // יצירת HTML למודאל
            let detailsHtml = `
        <div class="order-details-modal">
          <div class="modal-content">
            <span class="close-modal">&times;</span>
            <h3>פרטי הזמנה #${orderId}</h3>
            <div class="order-items">
      `;

            // בדיקה אם יש מודלים והצגתם
            if (orderDetails.models && orderDetails.models.length > 0) {
                orderDetails.models.forEach(model => {
                    const colorName = colorNames[model.color] || model.color;

                    detailsHtml += `
            <div class="order-item-detail">
              <p>דגם: <strong>${model.model_number || 'לא ידוע'}</strong></p>
              <p>גובה: <strong>${model.height} ס"מ</strong></p>
              <p>רוחב: <strong>${model.width} ס"מ</strong></p>
              <p>צבע: <strong>${colorName}</strong></p>
              <p>טקסטורה: <strong>${getTextureName(model.texture)}</strong></p>
            </div>
          `;
                });
            } else {
                detailsHtml += `<p>לא נמצאו פרטי מוצרים להזמנה זו</p>`;
            }

            detailsHtml += `
            </div>
            <div class="order-status">
              <p>תאריך: ${orderDetails.date ? new Date(orderDetails.date).toLocaleString('he-IL') : 'לא זמין'}</p>
              <p>סוג משלוח: ${getShippingText(orderDetails.shipping)}</p>
              <p>סכום: ${orderDetails.price} ש"ח</p>
            </div>
          </div>
        </div>
      `;

            // הוספת המודאל לעמוד
            $('body').append(detailsHtml);

            // טיפול בסגירת החלון
            $('.close-modal').click(function () {
                $('.order-details-modal').remove();
            });

        } catch (e) {
            console.error("Error parsing order details:", e, "Response:", response);
            alert('שגיאה בטעינת פרטי ההזמנה');
        }
    }).fail(function (xhr, status, error) {
        console.error("AJAX error:", status, error);
        alert('שגיאה בטעינת פרטי ההזמנה');
    });
}

$(document).ready(function () {
    document.addEventListener('DOMContentLoaded', function () {
        if (document.getElementById('ordersContainer')) {
            loadUserOrders();
        }
    });

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
        init3DModel();
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

    $('#nav-logout').click(function () {
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

    $('#add-to-cart').click(function () {
        const added = addItemToCart();
        if (added) {
            alert('הכד נוסף לעגלה');
        }
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

    // טיפול בטופס הזמנה
    $('#order-form').submit(function (e) {
        e.preventDefault();

        // וידוא שכל השדות החובה מלאים
        const requiredFields = $(this).find('[required]');
        let allFilled = true;

        requiredFields.each(function () {
            if (!$(this).val()) {
                allFilled = false;
                $(this).addClass('error');
            } else {
                $(this).removeClass('error');
            }
        });

        if (!allFilled) {
            alert('אנא מלא את כל שדות החובה');
            return;
        }

        $('#order-form').hide();
        renderPayPalButton();
        $('#back-to-form').show();
    });

    $('#shipping-type').change(updateFinalTotal);

    // עדכון טקסט של סלאידרים ביוזמת המשתמש
    updateModelScaleAndCamera();


});