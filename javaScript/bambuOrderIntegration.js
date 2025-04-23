// אובייקט המכיל מיפוי של סטטוס הדפסה לטקסט בעברית
var PRINT_STATUS_TEXT = {
  queued: "בתור להדפסה",
  preparing: "בהכנה להדפסה",
  printing: "בהדפסה",
  paused: "מושהה",
  completed: "הודפס בהצלחה",
  failed: "הדפסה נכשלה",
  cancelled: "הדפסה בוטלה"
};

function getTextureName(texture) {
  var textureNames = {
    'smooth': 'חלק',
    'rough': 'מחוספס',
    'matte': 'מט'
  };
  return textureNames[texture] || texture;
}

// אובייקט מיפוי צבעים לעברית
var colorNames = {
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

// הוספת פונקציונליות הדפסה לממשק המשתמש
$(document).ready(function() {
  console.log("Bambu Order Integration נטען בהצלחה");
  
  // הוספת לשונית הדפסה לחלונית הזמנה
  function addPrintTabToOrderModal() {
    // כפתור הדפסה לכל פריט בהזמנה
    $('.order-item-detail').each(function() {
      var orderItemDetail = $(this);
      
      // אם אין כבר כפתור הדפסה, נוסיף אותו
      if (orderItemDetail.find('.print-item-btn').length === 0) {
        var printButton = $(
          '<button class="print-item-btn">' +
          '<i class="fas fa-print"></i> שלח להדפסה' +
          '</button>'
        );
        
        // מציאת נתוני המודל מתוך הפריט
        var modelPath = orderItemDetail.find('.reorder-btn').data('model');
        var height = orderItemDetail.find('.reorder-btn').data('height');
        var width = orderItemDetail.find('.reorder-btn').data('width');
        var color = orderItemDetail.find('.reorder-btn').data('color');
        var texture = orderItemDetail.find('.reorder-btn').data('texture');
        
        // שמירת הנתונים בכפתור עצמו
        printButton.data('model', modelPath);
        printButton.data('height', height);
        printButton.data('width', width);
        printButton.data('color', color);
        printButton.data('texture', texture);
        
        // הוספת סגנון לכפתור ההדפסה
        printButton.css({
          'background-color': '#3498db',
          'color': 'white',
          'border': 'none',
          'border-radius': '30px',
          'padding': '10px 15px',
          'font-size': '14px',
          'font-weight': 'bold',
          'margin': '10px 5px',
          'cursor': 'pointer',
          'transition': 'all 0.3s ease'
        });
        
        // הוספת הכפתור לאחר כפתור ההזמנה מחדש
        orderItemDetail.find('.reorder-btn').after(printButton);
      }
    });
    
    // הוספת אירוע לחיצה לכפתורי ההדפסה
    $('.print-item-btn').off('click').on('click', function(e) {
      e.preventDefault();
      e.stopPropagation();
      
      // שליפת נתוני המודל מהכפתור
      var modelData = {
        modelPath: $(this).data('model'),
        height: $(this).data('height'),
        width: $(this).data('width'),
        color: $(this).data('color'),
        texture: $(this).data('texture')
      };
      
      // פתיחת חלונית הדפסה
      openPrintDialog(modelData, $(this));
    });
  }
  
  // פתיחת חלונית הדפסה
  function openPrintDialog(modelData, buttonElement) {
    // בדיקה אם כבר קיימת חלונית הדפסה פתוחה
    if ($('.print-dialog-modal').length > 0) {
      $('.print-dialog-modal').remove();
    }
    
    // יצירת חלונית הדפסה
    var printDialog = $(
      '<div class="print-dialog-modal">' +
      '  <div class="print-dialog-content">' +
      '    <span class="close-print-dialog">&times;</span>' +
      '    <h3>שליחה להדפסת תלת מימד</h3>' +
      '    ' +
      '    <div class="print-model-preview">' +
      '      <div class="print-model-image">' +
      '        <canvas id="print-preview-canvas" width="120" height="120"></canvas>' +
      '      </div>' +
      '      <div class="print-model-details">' +
      '        <p><strong>דגם:</strong> ' + getModelName(modelData.modelPath) + '</p>' +
      '        <p><strong>גובה:</strong> ' + modelData.height + ' ס"מ</p>' +
      '        <p><strong>רוחב:</strong> ' + modelData.width + ' ס"מ</p>' +
      '        <p><strong>צבע:</strong> <span class="color-preview" style="background-color:' + modelData.color + '"></span> ' + 
                  (colorNames[modelData.color] || modelData.color) + '</p>' +
      '        <p><strong>טקסטורה:</strong> ' + getTextureName(modelData.texture) + '</p>' +
      '      </div>' +
      '    </div>' +
      '    ' +
      '    <div class="print-settings-section">' +
      '      <h4>הגדרות הדפסה</h4>' +
      '      ' +
      '      <div class="print-setting">' +
      '        <label for="printer-select">בחר מדפסת:</label>' +
      '        <select id="printer-select">' +
      '          <option value="">טוען מדפסות...</option>' +
      '        </select>' +
      '      </div>' +
      '      ' +
      '      <div class="print-setting">' +
      '        <label for="material-select">חומר הדפסה:</label>' +
      '        <select id="material-select">' +
      '          <option value="PLA" selected>PLA - פלסטיק סטנדרטי</option>' +
      '          <option value="PETG">PETG - חזק יותר, עמיד למים</option>' +
      '          <option value="ABS">ABS - עמיד לחום</option>' +
      '          <option value="TPU">TPU - גמיש</option>' +
      '        </select>' +
      '      </div>' +
      '      ' +
      '      <div class="print-setting">' +
      '        <label for="quality-select">איכות הדפסה:</label>' +
      '        <select id="quality-select">' +
      '          <option value="draft">מהירה (0.3 מ"מ)</option>' +
      '          <option value="normal" selected>רגילה (0.2 מ"מ)</option>' +
      '          <option value="high">איכותית (0.1 מ"מ)</option>' +
      '        </select>' +
      '      </div>' +
      '      ' +
      '      <div class="print-setting">' +
      '        <label for="supports-toggle">תמיכות הדפסה:</label>' +
      '        <label class="switch">' +
      '          <input type="checkbox" id="supports-toggle">' +
      '          <span class="slider"></span>' +
      '        </label>' +
      '        <span class="toggle-label">כבוי</span>' +
      '      </div>' +
      '      ' +
      '      <div class="print-setting">' +
      '        <label for="infill-slider">צפיפות מילוי:</label>' +
      '        <input type="range" id="infill-slider" min="10" max="100" value="20" step="5">' +
      '        <span id="infill-value">20%</span>' +
      '      </div>' +
      '    </div>' +
      '    ' +
      '    <div class="print-status-section" style="display:none;">' +
      '      <h4>סטטוס הדפסה</h4>' +
      '      <div class="print-progress-container">' +
      '        <div class="print-progress-bar">' +
      '          <div class="print-progress-fill" style="width:0%"></div>' +
      '        </div>' +
      '        <div class="print-progress-text">0%</div>' +
      '      </div>' +
      '      <p class="print-status-text">ממתין לשליחה...</p>' +
      '      <p class="print-eta-text"></p>' +
      '    </div>' +
      '    ' +
      '    <div class="print-actions">' +
      '      <button id="send-to-print-btn" class="primary-action-btn">שלח להדפסה</button>' +
      '      <button id="cancel-print-btn" class="secondary-action-btn" style="display:none;">בטל הדפסה</button>' +
      '    </div>' +
      '  </div>' +
      '</div>'
    );
    
    // הוספת החלונית לעמוד
    $('body').append(printDialog);
    
    // סגנונות לחלונית
    styleModalDialog();
    
    // צביעת תצוגה מקדימה של הדגם
    colorPreviewVase('print-preview-canvas', modelData.modelPath, modelData.color);
    
    // טעינת רשימת המדפסות
    loadPrinters();
    
    // עדכון ערך צפיפות המילוי
    $('#infill-slider').on('input', function() {
      $('#infill-value').text($(this).val() + '%');
    });
    
    // עדכון מצב תמיכות
    $('#supports-toggle').on('change', function() {
      $('.toggle-label').text($(this).is(':checked') ? 'פעיל' : 'כבוי');
    });
    
    // סגירת החלונית
    $('.close-print-dialog').on('click', function() {
      $('.print-dialog-modal').remove();
    });
    
    // לחיצה מחוץ לחלונית סוגרת אותה
    $('.print-dialog-modal').on('click', function(e) {
      if ($(e.target).hasClass('print-dialog-modal')) {
        $('.print-dialog-modal').remove();
      }
    });
    
    // אירוע שליחה להדפסה
    $('#send-to-print-btn').on('click', function() {
      // קבלת הגדרות הדפסה מהממשק
      var printSettings = {
        printerSerial: $('#printer-select').val(),
        material: $('#material-select').val(),
        quality: $('#quality-select').val(),
        supports: $('#supports-toggle').is(':checked'),
        infill: parseInt($('#infill-slider').val())
      };
      
      // בדיקה שנבחרה מדפסת
      if (!printSettings.printerSerial) {
        alert('אנא בחר מדפסת לפני השליחה להדפסה');
        return;
      }
      
      // שליחה להדפסה
      sendModelToPrinter(modelData, printSettings);
    });
  }
  
  // פונקציה לטעינת רשימת המדפסות
  function loadPrinters() {
    // עדכון ממשק המשתמש
    $('#printer-select').html('<option value="">טוען מדפסות...</option>');
    
    // קבלת רשימת מדפסות מה-API
    bambuApi.getPrinters()
      .then(function(printers) {
        // ניקוי ועדכון רשימת המדפסות
        $('#printer-select').empty();
        
        if (printers && printers.length > 0) {
          printers.forEach(function(printer) {
            $('#printer-select').append(
              '<option value="' + printer.serial + '" ' +
              'data-model="' + printer.model + '" ' +
              'data-status="' + printer.status + '">' +
              (printer.name || printer.model) + ' (' + (printer.status === 'idle' ? 'פנויה' : 'בשימוש') + ')' +
              '</option>'
            );
          });
        } else {
          $('#printer-select').html('<option value="">לא נמצאו מדפסות זמינות</option>');
        }
      })
      .catch(function(error) {
        console.error("שגיאה בטעינת רשימת מדפסות:", error);
        $('#printer-select').html('<option value="">שגיאה בטעינת מדפסות</option>');
      });
  }
  
  // פונקציה לשליחת מודל להדפסה
  function sendModelToPrinter(modelData, printSettings) {
    // הצגת אזור סטטוס הדפסה
    $('.print-status-section').show();
    $('.print-status-text').text('מכין את המודל להדפסה...');
    
    // הסתרת כפתור השליחה והצגת כפתור ביטול
    $('#send-to-print-btn').hide();
    $('#cancel-print-btn').show();
    
    // המרת הגדרות ממשק המשתמש להגדרות הדפסה
    var qualitySettings = {
      draft: { layer_height: 0.3, print_speed: 80 },
      normal: { layer_height: 0.2, print_speed: 60 },
      high: { layer_height: 0.1, print_speed: 40 }
    };
    
    // בניית הגדרות ההדפסה הסופיות
    var bambuPrintSettings = {
      layer_height: qualitySettings[printSettings.quality].layer_height,
      print_speed: qualitySettings[printSettings.quality].print_speed,
      infill_density: printSettings.infill,
      supports: printSettings.supports,
      material: printSettings.material,
      bed_temperature: getMaterialBedTemp(printSettings.material),
      temperature: getMaterialHotendTemp(printSettings.material)
    };
    
    // קבלת קובץ ה-STL מהשרת
    $('.print-status-text').text('מוריד את קובץ המודל...');
    updateProgress(10);
    
    // שימוש בנתיב המודל מהפרמטרים
    var stlFilePath = modelData.modelPath;
    
    // טעינת קובץ STL באמצעות fetch
    fetch(stlFilePath)
      .then(function(stlResponse) {
        if (!stlResponse.ok) {
          throw new Error('שגיאה בטעינת קובץ STL: ' + stlResponse.status + ' ' + stlResponse.statusText);
        }
        return stlResponse.blob();
      })
      .then(function(stlBlob) {
        updateProgress(30);
        
        // שליחת הקובץ להדפסה
        $('.print-status-text').text('שולח את המודל למדפסת...');
        
        // שליחה להדפסה דרך ה-API
        return bambuApi.sendToPrint(
          stlBlob, 
          bambuPrintSettings,
          printSettings.printerSerial
        );
      })
      .then(function(printJob) {
        if (!printJob || !printJob.print_id) {
          throw new Error('לא התקבל מזהה הדפסה תקין');
        }
        
        updateProgress(50);
        $('.print-status-text').text('המודל נשלח להדפסה!');
        
        // התחלת מעקב אחר סטטוס ההדפסה
        startPrintTracking(printJob.print_id, printSettings.printerSerial);
        
        // עדכון כפתור הביטול
        $('#cancel-print-btn').data('print-id', printJob.print_id);
        $('#cancel-print-btn').data('printer-serial', printSettings.printerSerial);
        $('#cancel-print-btn').on('click', cancelCurrentPrint);
      })
      .catch(function(error) {
        console.error("שגיאה בהורדת/שליחת המודל:", error);
        $('.print-status-text').text('שגיאה בשליחת המודל: ' + error.message);
        updateProgress(0);
        
        // החזרת כפתור השליחה
        $('#send-to-print-btn').show();
        $('#cancel-print-btn').hide();
      });
  }
  
  // פונקציה למעקב אחר הדפסה
  function startPrintTracking(printId, printerSerial) {
    // משתנה לשמירת טיימר העדכון
    var trackingInterval = null;
    
    // פונקציה פנימית לעדכון סטטוס
    function updatePrintStatus() {
      // קבלת סטטוס הדפסה עדכני
      bambuApi.getPrintStatus(printId, printerSerial)
        .then(function(status) {
          if (!status) {
            throw new Error('לא התקבל סטטוס הדפסה');
          }
          
          // עדכון התקדמות באחוזים
          var progress = status.progress || 0;
          updateProgress(progress);
          
          // עדכון טקסט סטטוס
          var statusText = PRINT_STATUS_TEXT[status.status] || status.status;
          $('.print-status-text').text('סטטוס: ' + statusText);
          
          // עדכון זמן משוער לסיום
          if (status.eta) {
            var etaDate = new Date(status.eta);
            var formattedEta = etaDate.toLocaleTimeString('he-IL', { 
              hour: '2-digit', 
              minute: '2-digit' 
            });
            $('.print-eta-text').text('זמן משוער לסיום: ' + formattedEta);
          }
          
          // בדיקה אם ההדפסה הסתיימה
          if (['completed', 'failed', 'cancelled'].includes(status.status)) {
            // עצירת המעקב
            clearInterval(trackingInterval);
            
            // עדכון ממשק בהתאם לסטטוס
            if (status.status === 'completed') {
              $('.print-status-text').text('ההדפסה הושלמה בהצלחה! 🎉');
            } else if (status.status === 'failed') {
              $('.print-status-text').text('ההדפסה נכשלה. אנא בדוק את המדפסת.');
            } else if (status.status === 'cancelled') {
              $('.print-status-text').text('ההדפסה בוטלה.');
            }
            
            // הסתרת כפתור הביטול והצגת כפתור סגירה
            $('#cancel-print-btn').hide();
            $('#send-to-print-btn').show().text('סגור').off('click').on('click', function() {
              $('.print-dialog-modal').remove();
            });
          }
        })
        .catch(function(error) {
          console.error("שגיאה בעדכון סטטוס הדפסה:", error);
          $('.print-status-text').text('שגיאה בקבלת עדכון סטטוס: ' + error.message);
        });
    }
    
    // התחלת עדכון סטטוס כל 5 שניות
    trackingInterval = setInterval(updatePrintStatus, 5000);
    
    // עדכון ראשוני מיידית
    updatePrintStatus();
  }
  
  // פונקציה לביטול הדפסה נוכחית
  function cancelCurrentPrint() {
    var printId = $(this).data('print-id');
    var printerSerial = $(this).data('printer-serial');
    
    if (!printId || !printerSerial) {
      $('.print-status-text').text('שגיאה: חסרים פרטי הדפסה לביטול');
      return;
    }
    
    // עדכון סטטוס
    $('.print-status-text').text('מבטל הדפסה...');
    
    // שליחת בקשת ביטול
    bambuApi.cancelPrint(printId, printerSerial)
      .then(function() {
        // עדכון ממשק
        $('.print-status-text').text('ההדפסה בוטלה בהצלחה');
        updateProgress(0);
        
        // הסתרת כפתור הביטול והצגת כפתור סגירה
        $('#cancel-print-btn').hide();
        $('#send-to-print-btn').show().text('סגור').off('click').on('click', function() {
          $('.print-dialog-modal').remove();
        });
      })
      .catch(function(error) {
        console.error("שגיאה בביטול הדפסה:", error);
        $('.print-status-text').text('שגיאה בביטול ההדפסה: ' + error.message);
      });
  }
  
  // פונקציית עזר לעדכון סרגל התקדמות
  function updateProgress(percent) {
    $('.print-progress-fill').css('width', percent + '%');
    $('.print-progress-text').text(Math.round(percent) + '%');
  }
  
  // פונקציית עזר לקבלת טמפרטורת מיטה עבור חומר
  function getMaterialBedTemp(material) {
    var temps = {
      'PLA': 60,
      'PETG': 75,
      'ABS': 100,
      'TPU': 50
    };
    return temps[material] || 60;
  }
  
  // פונקציית עזר לקבלת טמפרטורת ראש הדפסה עבור חומר
  function getMaterialHotendTemp(material) {
    var temps = {
      'PLA': 210,
      'PETG': 235,
      'ABS': 245,
      'TPU': 220
    };
    return temps[material] || 210;
  }
  
  // פונקציית עזר לקבלת שם מודל מנתיב
  function getModelName(modelPath) {
    if (!modelPath) return 'לא ידוע';
    
    // הסרת תחילית של נתיב
    var name = modelPath.replace('models/', '');
    
    // הסרת סיומת
    name = name.replace('.stl', '');
    
    // המרה של vase1 ל'כד 1' וכו'
    if (name.indexOf('vase') === 0) {
      var num = name.replace('vase', '');
      name = 'כד ' + num;
    }
    
    return name;
  }
  
  // פונקציית עזר לצביעת תצוגה מקדימה של הכד
  function colorPreviewVase(canvasId, modelPath, color) {
    var canvas = document.getElementById(canvasId);
    if (!canvas) return;
    
    var ctx = canvas.getContext('2d');
    var img = new Image();
    
    // קבלת נתיב תמונה מנתיב המודל
    var imagePath = modelPath;
    if (modelPath.indexOf('.stl') !== -1) {
      imagePath = modelPath.replace('.stl', '.png');
    }
    if (imagePath.indexOf('models/') !== -1) {
      imagePath = imagePath.replace('models/', '/images/');
    }
    if (imagePath.indexOf('/') !== 0) {
      imagePath = '/images/' + imagePath;
    }
    
    // טעינת התמונה וצביעתה
    img.onload = function() {
      // ציור התמונה
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // חישוב יחס גודל להתאמה לקנבס
      var ratio = Math.min(canvas.width / img.width, canvas.height / img.height);
      var centerX = (canvas.width - img.width * ratio) / 2;
      var centerY = (canvas.height - img.height * ratio) / 2;
      
      ctx.drawImage(img, centerX, centerY, img.width * ratio, img.height * ratio);
      
      // צביעת הפיקסלים
      var imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      var pixels = imageData.data;
      
      // המרת צבע הקס ל-RGB
      var r = parseInt(color.slice(1, 3), 16);
      var g = parseInt(color.slice(3, 5), 16);
      var b = parseInt(color.slice(5, 7), 16);
      
      // שינוי כל פיקסל
      for (var i = 0; i < pixels.length; i += 4) {
        var alpha = pixels[i + 3];
        if (alpha > 0) { // רק פיקסלים לא שקופים
          // שמירה על הצללה מהתמונה המקורית
          var avg = (pixels[i] + pixels[i + 1] + pixels[i + 2]) / 3;
          var factor = avg / 255;
          
          // צביעה תוך שמירה על הצללות
          pixels[i] = r * factor;
          pixels[i + 1] = g * factor;
          pixels[i + 2] = b * factor;
        }
      }
      
      // החזרת התמונה הצבועה לקנבס
      ctx.putImageData(imageData, 0, 0);
    };
    
    img.onerror = function() {
      // במקרה של שגיאה, טוען תמונת ברירת מחדל
      console.error('שגיאה בטעינת התמונה:', imagePath);
      
      // מציירים ריבוע בצבע כתחליף
      ctx.fillStyle = color;
      ctx.fillRect(10, 10, canvas.width - 20, canvas.height - 20);
      ctx.fillStyle = '#ffffff';
      ctx.font = '10px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('אין תמונה', canvas.width / 2, canvas.height / 2);
    };
    
    img.src = imagePath;
  }
  
  // פונקציית עזר לסגנון החלונית
  function styleModalDialog() {
    $('.print-dialog-modal').css({
      'position': 'fixed',
      'top': '0',
      'left': '0',
      'width': '100%',
      'height': '100%',
      'background-color': 'rgba(0, 0, 0, 0.6)',
      'display': 'flex',
      'justify-content': 'center',
      'align-items': 'center',
      'z-index': '10010',
      'direction': 'rtl'
    });
    
    $('.print-dialog-content').css({
      'background': 'white',
      'width': '90%',
      'max-width': '500px',
      'border-radius': '15px',
      'padding': '30px',
      'box-shadow': '0 10px 25px rgba(0, 0, 0, 0.2)',
      'position': 'relative',
      'max-height': '80vh',
      'overflow-y': 'auto'
    });
    
    $('.close-print-dialog').css({
      'position': 'absolute',
      'top': '15px',
      'left': '15px',
      'font-size': '24px',
      'color': '#ff7a59',
      'cursor': 'pointer',
      'padding': '5px 10px',
      'border-radius': '50%',
      'transition': 'all 0.3s ease'
    });
    
    $('.print-model-preview').css({
      'display': 'flex',
      'margin-bottom': '20px',
      'padding': '15px',
      'background': '#f9f9f9',
      'border-radius': '10px',
      'align-items': 'center'
    });
    
    $('.print-model-image').css({
      'margin-left': '15px',
      'flex': '0 0 auto'
    });
    
    $('.print-model-details').css({
      'flex': '1'
    });
    
$('.color-preview').css({
      'display': 'inline-block',
      'width': '15px',
      'height': '15px',
      'border-radius': '50%',
      'margin-left': '5px',
      'vertical-align': 'middle'
    });
    
    $('.print-settings-section, .print-status-section').css({
      'margin': '20px 0',
      'padding': '15px',
      'background': '#f9f9f9',
      'border-radius': '10px'
    });
    
    $('.print-setting').css({
      'margin-bottom': '15px'
    });
    
    $('.print-setting label').css({
      'display': 'block',
      'margin-bottom': '5px',
      'font-weight': 'bold'
    });
    
    $('.print-setting select, .print-setting input[type="range"]').css({
      'width': '100%',
      'padding': '8px',
      'border-radius': '5px',
      'border': '1px solid #ddd'
    });
    
    $('.print-progress-container').css({
      'margin': '15px 0'
    });
    
    $('.print-progress-bar').css({
      'height': '20px',
      'background': '#eee',
      'border-radius': '10px',
      'overflow': 'hidden',
      'margin-bottom': '5px'
    });
    
    $('.print-progress-fill').css({
      'height': '100%',
      'background': 'linear-gradient(90deg, #ff7a59, #ff5233)',
      'border-radius': '10px',
      'transition': 'width 0.5s ease'
    });
    
    $('.print-actions').css({
      'display': 'flex',
      'justify-content': 'space-between',
      'margin-top': '20px'
    });
    
    $('.primary-action-btn').css({
      'background': 'linear-gradient(135deg, #ff7a59 0%, #ff5733 100%)',
      'color': 'white',
      'border': 'none',
      'border-radius': '30px',
      'padding': '12px 25px',
      'font-weight': 'bold',
      'cursor': 'pointer',
      'flex': '1',
      'margin-left': '10px',
      'transition': 'all 0.3s ease'
    });
    
    $('.secondary-action-btn').css({
      'background': '#e74c3c',
      'color': 'white',
      'border': 'none',
      'border-radius': '30px',
      'padding': '12px 25px',
      'font-weight': 'bold',
      'cursor': 'pointer',
      'flex': '1',
      'transition': 'all 0.3s ease'
    });
    
    // עיצוב למתג
    $('.switch').css({
      'position': 'relative',
      'display': 'inline-block',
      'width': '60px',
      'height': '30px',
      'margin': '0 10px'
    });
    
    $('.switch input').css({
      'opacity': '0',
      'width': '0',
      'height': '0'
    });
    
    $('.slider').css({
      'position': 'absolute',
      'cursor': 'pointer',
      'top': '0',
      'left': '0',
      'right': '0',
      'bottom': '0',
      'background-color': '#ccc',
      'transition': '0.4s',
      'border-radius': '30px'
    });
    
    // CSS לחלק ה-:before של ה-slider
    $('<style>')
      .prop('type', 'text/css')
      .html(
        '.slider:before {' +
        '  position: absolute;' +
        '  content: "";' +
        '  height: 22px;' +
        '  width: 22px;' +
        '  left: 4px;' +
        '  bottom: 4px;' +
        '  background-color: white;' +
        '  transition: 0.4s;' +
        '  border-radius: 50%;' +
        '}' +
        '' +
        'input:checked + .slider {' +
        '  background-color: #ff7a59;' +
        '}' +
        '' +
        'input:checked + .slider:before {' +
        '  transform: translateX(30px);' +
        '}'
      )
      .appendTo('head');
  }
  
  // הוספת לשונית הדפסה בכל פעם שחלונית ההזמנות נפתחת
  $(document).on('click', '.order-details-btn', function() {
    // תצפית על הוספת פרטי הזמנה לDOM
    var observer = new MutationObserver(function(mutations) {
      mutations.forEach(function(mutation) {
        if (mutation.addedNodes.length) {
          // בדיקה אם הוספנו את חלונית פרטי ההזמנה
          if ($('.order-details-modal').length) {
            // הוספת לשונית הדפסה לאחר שהחלונית כבר בDOM
            setTimeout(addPrintTabToOrderModal, 300);
            
            // הפסקת התצפית
            observer.disconnect();
          }
        }
      });
    });
    
    // התחלת תצפית על שינויים בגוף הדף
    observer.observe(document.body, { childList: true, subtree: true });
  });
  
  // אתחול - בדיקת חיבור ל-API
  bambuApi.authenticate()
    .then(function() {
      console.log("מחובר בהצלחה ל-Bambu API");
    })
    .catch(function(error) {
      console.error("שגיאת התחברות ל-Bambu API:", error);
    });
});'
      