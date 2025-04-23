// bambuAPI.js - מימוש ממשק ל-Bambu API לשליחת הדפסות תלת מימד

// הגדרות בסיסיות של ה-API
var BAMBU_API_CONFIG = {
  apiKey: "YOUR_BAMBU_API_KEY",      // יש להחליף במפתח האמיתי שלך
  apiEndpoint: "https://api.bambulab.com/v1", // שים לב: יתכן שהכתובת תהיה שונה, בדוק בתיעוד הרשמי
  defaultPrinterSerial: "",          // ניתן להגדיר מספר סידורי של מדפסת ברירת מחדל
  defaultTimeoutMs: 30000,           // טיימאאוט לבקשות API
  debug: true                         // מצב דיבאג - מדפיס מידע לקונסול
};

/**
 * מחלקה לניהול תקשורת עם Bambu API
 */
function BambuApiClient(config) {
  config = config || {};
  
  // שימוש ב-Object.assign במקום spread operator
  this.config = Object.assign({}, BAMBU_API_CONFIG, config);
  this.authToken = null;
  this.printers = [];
  
  // בדיקת הגדרות
  if (this.config.debug) {
    console.log("BambuApiClient נטען עם ההגדרות:", 
                JSON.stringify(this.config, null, 2));
  }
}

/**
 * התחברות ל-API וקבלת טוקן
 */
BambuApiClient.prototype.authenticate = function() {
  var self = this;
  
  return new Promise(function(resolve, reject) {
    fetch(self.config.apiEndpoint + "/auth/login", {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        api_key: self.config.apiKey
      })
    })
    .then(function(response) {
      if (!response.ok) {
        throw new Error("שגיאת התחברות: " + response.status + " " + response.statusText);
      }
      return response.json();
    })
    .then(function(data) {
      self.authToken = data.access_token;
      
      if (self.config.debug) {
        console.log("התחברות לשרת Bambu בוצעה בהצלחה");
      }
      
      resolve(true);
    })
    .catch(function(error) {
      console.error("שגיאה בהתחברות ל-Bambu API:", error);
      reject(error);
    });
  });
};

/**
 * בדיקה האם המשתמש מחובר, ואם לא - התחברות
 */
BambuApiClient.prototype.ensureAuthenticated = function() {
  var self = this;
  
  return new Promise(function(resolve, reject) {
    if (!self.authToken) {
      self.authenticate()
        .then(function() {
          resolve(self.authToken);
        })
        .catch(function(error) {
          reject(error);
        });
    } else {
      resolve(self.authToken);
    }
  });
};

/**
 * קבלת רשימת המדפסות המחוברות
 */
BambuApiClient.prototype.getPrinters = function() {
  var self = this;
  
  return new Promise(function(resolve, reject) {
    self.ensureAuthenticated()
      .then(function() {
        return fetch(self.config.apiEndpoint + "/printers", {
          headers: {
            'Authorization': 'Bearer ' + self.authToken,
            'Accept': 'application/json'
          }
        });
      })
      .then(function(response) {
        if (!response.ok) {
          throw new Error("שגיאה בקבלת רשימת מדפסות: " + response.status + " " + response.statusText);
        }
        return response.json();
      })
      .then(function(data) {
        self.printers = data.printers || [];
        
        if (self.config.debug) {
          console.log("נמצאו " + self.printers.length + " מדפסות מחוברות:", self.printers);
        }
        
        resolve(self.printers);
      })
      .catch(function(error) {
        console.error("שגיאה בקבלת רשימת מדפסות:", error);
        reject(error);
      });
  });
};

/**
 * קבלת סטטוס של מדפסת ספציפית
 * @param {string} printerSerial - המספר הסידורי של המדפסת
 */
BambuApiClient.prototype.getPrinterStatus = function(printerSerial) {
  var self = this;
  
  return new Promise(function(resolve, reject) {
    var serial = printerSerial || self.config.defaultPrinterSerial;
    if (!serial) {
      reject(new Error("לא צוין מספר סידורי של מדפסת"));
      return;
    }
    
    self.ensureAuthenticated()
      .then(function() {
        return fetch(self.config.apiEndpoint + "/printers/" + serial + "/status", {
          headers: {
            'Authorization': 'Bearer ' + self.authToken,
            'Accept': 'application/json'
          }
        });
      })
      .then(function(response) {
        if (!response.ok) {
          throw new Error("שגיאה בקבלת סטטוס מדפסת: " + response.status + " " + response.statusText);
        }
        return response.json();
      })
      .then(function(data) {
        if (self.config.debug) {
          console.log("התקבל סטטוס מדפסת " + serial + ":", data);
        }
        
        resolve(data);
      })
      .catch(function(error) {
        console.error("שגיאה בקבלת סטטוס מדפסת:", error);
        reject(error);
      });
  });
};

/**
 * שליחת קובץ STL להדפסה
 * @param {File|Blob} stlFile - קובץ STL לשליחה 
 * @param {Object} printSettings - הגדרות הדפסה
 * @param {string} printerSerial - מספר סידורי של המדפסת
 */
BambuApiClient.prototype.sendToPrint = function(stlFile, printSettings, printerSerial) {
  var self = this;
  printSettings = printSettings || {};
  
  return new Promise(function(resolve, reject) {
    var serial = printerSerial || self.config.defaultPrinterSerial;
    if (!serial) {
      reject(new Error("לא צוין מספר סידורי של מדפסת"));
      return;
    }
    
    if (!stlFile) {
      reject(new Error("לא סופק קובץ STL להדפסה"));
      return;
    }
    
    self.ensureAuthenticated()
      .then(function() {
        // הגדרות ברירת מחדל להדפסה
        var defaultSettings = {
          layer_height: 0.2,           // גובה שכבה במ"מ
          temperature: 210,            // טמפרטורת ראש ההדפסה בצלזיוס
          bed_temperature: 60,         // טמפרטורת משטח ההדפסה בצלזיוס
          infill_density: 20,          // צפיפות מילוי באחוזים
          print_speed: 60,             // מהירות הדפסה במ"מ לשנייה
          supports: false,             // האם להוסיף תמיכות
          material: "PLA"              // סוג החומר
        };
        
        // שילוב הגדרות המשתמש עם ברירות המחדל
        var settings = Object.assign({}, defaultSettings, printSettings);
        
        // יצירת FormData לשליחת הקובץ
        var formData = new FormData();
        formData.append('file', stlFile);
        
        // הוספת הגדרות ההדפסה
        Object.keys(settings).forEach(function(key) {
          formData.append("settings[" + key + "]", settings[key]);
        });
        
        // שליחת הקובץ להדפסה
        return fetch(self.config.apiEndpoint + "/printers/" + serial + "/print", {
          method: 'POST',
          headers: {
            'Authorization': 'Bearer ' + self.authToken
          },
          body: formData
        });
      })
      .then(function(response) {
        if (!response.ok) {
          throw new Error("שגיאה בשליחת הדפסה: " + response.status + " " + response.statusText);
        }
        return response.json();
      })
      .then(function(data) {
        if (self.config.debug) {
          console.log("ההדפסה נשלחה בהצלחה. מזהה הדפסה:", data.print_id);
        }
        
        resolve(data);
      })
      .catch(function(error) {
        console.error("שגיאה בשליחת הדפסה:", error);
        reject(error);
      });
  });
};

/**
 * מעקב אחר סטטוס הדפסה מסוימת
 * @param {string} printId - מזהה ההדפסה שהתקבל בעת שליחת ההדפסה
 * @param {string} printerSerial - מספר סידורי של המדפסת 
 */
BambuApiClient.prototype.getPrintStatus = function(printId, printerSerial) {
  var self = this;
  
  return new Promise(function(resolve, reject) {
    var serial = printerSerial || self.config.defaultPrinterSerial;
    if (!serial) {
      reject(new Error("לא צוין מספר סידורי של מדפסת"));
      return;
    }
    
    if (!printId) {
      reject(new Error("לא צוין מזהה הדפסה"));
      return;
    }
    
    self.ensureAuthenticated()
      .then(function() {
        return fetch(self.config.apiEndpoint + "/printers/" + serial + "/prints/" + printId, {
          headers: {
            'Authorization': 'Bearer ' + self.authToken,
            'Accept': 'application/json'
          }
        });
      })
      .then(function(response) {
        if (!response.ok) {
          throw new Error("שגיאה בקבלת סטטוס הדפסה: " + response.status + " " + response.statusText);
        }
        return response.json();
      })
      .then(function(data) {
        if (self.config.debug) {
          console.log("סטטוס הדפסה " + printId + ":", data);
        }
        
        resolve(data);
      })
      .catch(function(error) {
        console.error("שגיאה בקבלת סטטוס הדפסה:", error);
        reject(error);
      });
  });
};

/**
 * ביטול הדפסה פעילה
 * @param {string} printId - מזהה ההדפסה לביטול
 * @param {string} printerSerial - מספר סידורי של המדפסת
 */
BambuApiClient.prototype.cancelPrint = function(printId, printerSerial) {
  var self = this;
  
  return new Promise(function(resolve, reject) {
    var serial = printerSerial || self.config.defaultPrinterSerial;
    if (!serial) {
      reject(new Error("לא צוין מספר סידורי של מדפסת"));
      return;
    }
    
    if (!printId) {
      reject(new Error("לא צוין מזהה הדפסה"));
      return;
    }
    
    self.ensureAuthenticated()
      .then(function() {
        return fetch(self.config.apiEndpoint + "/printers/" + serial + "/prints/" + printId + "/cancel", {
          method: 'POST',
          headers: {
            'Authorization': 'Bearer ' + self.authToken,
            'Accept': 'application/json'
          }
        });
      })
      .then(function(response) {
        if (!response.ok) {
          throw new Error("שגיאה בביטול הדפסה: " + response.status + " " + response.statusText);
        }
        return response.json();
      })
      .then(function(data) {
        if (self.config.debug) {
          console.log("הדפסה " + printId + " בוטלה בהצלחה:", data);
        }
        
        resolve(data);
      })
      .catch(function(error) {
        console.error("שגיאה בביטול הדפסה:", error);
        reject(error);
      });
  });
};

/**
 * המרת מודל תלת מימדי להגדרות הדפסה מתאימות 
 * @param {Object} modelData - נתוני המודל (גובה, רוחב, צבע, טקסטורה)
 * @returns {Object} - הגדרות הדפסה מותאמות
 */
BambuApiClient.prototype.calculatePrintSettings = function(modelData) {
  // דוגמה להמרה של נתוני המודל להגדרות הדפסה
  var height = modelData.height;
  var width = modelData.width;
  var texture = modelData.texture;
  
  // המרת טקסטורה להגדרות הדפסה
  var textureSettings = {
    smooth: { layer_height: 0.1, print_speed: 50 },
    rough: { layer_height: 0.3, print_speed: 70 },
    matte: { layer_height: 0.2, print_speed: 60 }
  };
  
  // הגדרות בסיסיות
  var baseSettings = {
    infill_density: 15,         // צפיפות מילוי ברירת מחדל
    bed_temperature: 60,        // טמפרטורת משטח הדפסה
    temperature: 210,           // טמפרטורת ראש הדפסה לפלסטיק PLA
    material: "PLA",            // חומר ברירת מחדל
    supports: false             // ברירת מחדל ללא תמיכות
  };
  
  // התאמת צפיפות המילוי לפי גודל המודל
  var infillDensity = 15;
  if (height > 20 || width > 20) {
    infillDensity = 10;
  } else if (height < 10 || width < 10) {
    infillDensity = 20;
  }
  
  // שילוב של כל ההגדרות
  var result = Object.assign({}, baseSettings);
  
  // הוסף הגדרות טקסטורה אם קיימות
  if (textureSettings[texture]) {
    Object.assign(result, textureSettings[texture]);
  }
  
  // עדכן צפיפות מילוי
  result.infill_density = infillDensity;
  
  return result;
};

// יצירת מופע גלובלי של הלקוח
var bambuApi = new BambuApiClient();

// אפשרות 1: ייצוא גלובלי בסביבת דפדפן
if (typeof window !== 'undefined') {
  window.BambuApiClient = BambuApiClient;
  window.bambuApi = bambuApi;
}

// אפשרות 2: ייצוא בסביבת Node.js
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    BambuApiClient: BambuApiClient,
    bambuApi: bambuApi
  };
}