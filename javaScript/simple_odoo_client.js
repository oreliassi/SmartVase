
console.log("✅ Loading Complete Odoo Client...");


const SimpleOdooClient = {
    
    proxyUrl: '/php/odoo_proxy.php',
    connected: false,
    uid: null,
    materials: [],
    materialsLoaded: false,
    lastError: null,
    
    
    log: function(message, data) {
        const timestamp = new Date().toISOString();
        console.log(`[${timestamp}] [Odoo Client] ${message}`, data || '');
    },
    
    
    init: function() {
        const self = this;
        self.log("Initializing Odoo Client...");
        
        
        (async function() {
            try {

                const authResult = await self.authenticate();
                if (authResult.success) {
                    self.connected = true;
                    self.uid = authResult.uid;
                    self.log("Authentication successful", `UID: ${authResult.uid}`);
                    
                    
                    await self.loadMaterials();
                } else {
                    self.log("Authentication failed", authResult.error);
                    self.lastError = "Authentication failed: " + authResult.error;
                    
                    self.useFallbackMaterials();
                }
            } catch (error) {
                self.log("Initialization error", error);
                self.lastError = "Initialization error: " + error.message;

                self.useFallbackMaterials();
            }
        })();
    },
    
   
    authenticate: function() {
        const self = this;
        return new Promise(async function(resolve) {
            try {
                self.log("Attempting authentication...");
                
                const response = await fetch(self.proxyUrl + '?endpoint=authenticate', {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    credentials: 'same-origin'
                });
                
                if (!response.ok) {
                    resolve({
                        success: false,
                        error: `HTTP ${response.status}: ${response.statusText}`
                    });
                    return;
                }
                
                const result = await response.json();
                
                if (result.error) {
                    resolve({
                        success: false,
                        error: typeof result.error === 'object' ? JSON.stringify(result.error) : result.error
                    });
                    return;
                }
                
                if (result.result && result.result.uid) {
                    resolve({
                        success: true,
                        uid: result.result.uid,
                        data: result.result
                    });
                    return;
                }
                
                resolve({
                    success: false,
                    error: "No UID in authentication response"
                });
                
            } catch (error) {
                self.log("Authentication error", error);
                resolve({
                    success: false,
                    error: error.message
                });
            }
        });
    },
    
    
    loadMaterials: function() {
        const self = this;
        return new Promise(async function(resolve) {
            try {
                self.log("Loading materials from Odoo...");
                
                const response = await fetch(self.proxyUrl + '?endpoint=materials', {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    credentials: 'same-origin'
                });
                
                if (!response.ok) {
                    self.log("Materials request failed", `HTTP ${response.status}`);
                    resolve(self.useFallbackMaterials());
                    return;
                }
                
                const result = await response.json();
                
                if (result.error) {
                    self.log("Materials API error", result.error);
                    resolve(self.useFallbackMaterials());
                    return;
                }
                
                if (result.result && Array.isArray(result.result)) {
                    self.materials = result.result;
                    self.materialsLoaded = true;
                    self.log(`Successfully loaded ${self.materials.length} materials from Odoo`);
                    resolve(self.materials);
                    return;
                }
                
                self.log("Invalid materials response format", result);
                resolve(self.useFallbackMaterials());
                
            } catch (error) {
                self.log("Materials loading error", error);
                resolve(self.useFallbackMaterials());
            }
        });
    },
    
    
    useFallbackMaterials: function() {
        this.log("Using fallback materials data");
        
        this.materials = [
            { id: 1, name: "PLA White", code: "PLA-W", price: 0.15, qty_available: 50, in_stock: true },
            { id: 2, name: "PLA Black", code: "PLA-B", price: 0.15, qty_available: 45, in_stock: true },
            { id: 3, name: "PLA Red", code: "PLA-R", price: 0.15, qty_available: 30, in_stock: true },
            { id: 4, name: "PLA Green", code: "PLA-G", price: 0.15, qty_available: 35, in_stock: true },
            { id: 5, name: "PLA Blue", code: "PLA-BL", price: 0.15, qty_available: 40, in_stock: true },
            { id: 6, name: "PLA Yellow", code: "PLA-Y", price: 0.15, qty_available: 25, in_stock: true },
            { id: 7, name: "PLA Purple", code: "PLA-P", price: 0.15, qty_available: 30, in_stock: true },
            { id: 8, name: "PLA Cyan", code: "PLA-C", price: 0.15, qty_available: 28, in_stock: true },
            { id: 9, name: "PLA Gray", code: "PLA-GR", price: 0.15, qty_available: 32, in_stock: true },
            { id: 10, name: "PLA Orange", code: "PLA-O", price: 0.15, qty_available: 27, in_stock: true },
            { id: 11, name: "PLA White Matte", code: "PLA-WM", price: 0.18, qty_available: 20, in_stock: true },
            { id: 12, name: "PLA Black Matte", code: "PLA-BM", price: 0.18, qty_available: 18, in_stock: true },
            { id: 13, name: "PLA Red Matte", code: "PLA-RM", price: 0.18, qty_available: 15, in_stock: true },
            { id: 14, name: "PLA Green Matte", code: "PLA-GM", price: 0.18, qty_available: 16, in_stock: true },
            { id: 15, name: "PLA Blue Matte", code: "PLA-BLM", price: 0.18, qty_available: 19, in_stock: true }
        ];
        
        this.materialsLoaded = true;
        return this.materials;
    },
    
    
    findMaterialByColor: function(colorHex, texture) {
        texture = texture || 'smooth';
        colorHex = colorHex.toLowerCase();
        if (!colorHex.startsWith('#')) {
            colorHex = '#' + colorHex;
        }
        
        this.log(`Looking for material with color: ${colorHex}, texture: ${texture}`);
        
        const colorMapping = {
            "#e7d5d5": "white",
            "#000000": "black",
            "#f14a4a": "red",
            "#99db99": "green",
            "#7878f1": "blue",
            "#ffeb94": "yellow",
            "#dd8add": "purple",
            "#99dada": "cyan",
            "#aaaaaa": "gray",
            "#ffa500": "orange"
        };
        
        const colorName = colorMapping[colorHex];
        if (!colorName) {
            this.log(`No color mapping found for ${colorHex}`);
            return null;
        }
        
        let expectedMaterialName;
        if (texture === 'matte') {
            expectedMaterialName = `PLA ${colorName.charAt(0).toUpperCase() + colorName.slice(1)} Matte`;
        } else {
            expectedMaterialName = `PLA ${colorName.charAt(0).toUpperCase() + colorName.slice(1)}`;
        }
        
        this.log(`Looking for material named: "${expectedMaterialName}"`);
        
        let material = this.materials.find(function(m) {
            if (!m.name) return false;
            const cleanName = m.name.trim();
            return cleanName === expectedMaterialName;
        });
        
        if (material) {
            this.log(`Found exact match: ${material.name}`);
            return material;
        }
        
        material = this.materials.find(function(m) {
            if (!m.name) return false;
            const materialName = m.name.toLowerCase().trim();
            const hasColor = materialName.includes(colorName);
            
            if (texture === 'matte') {
                return hasColor && materialName.includes('matte');
            } else {
                return hasColor && !materialName.includes('matte');
            }
        });
        
        if (material) {
            this.log(`Found partial match: ${material.name}`);
        } else {
            this.log(`No material found for color ${colorHex}, texture ${texture}`);
        }
        
        return material;
    },
    
    
    checkMaterialAvailability: function(colorHex, texture, requiredWeightGrams) {
        const self = this;
        return new Promise(function(resolve) {
            try {
                texture = texture || 'smooth';
                requiredWeightGrams = requiredWeightGrams || 0;
                
                const material = self.findMaterialByColor(colorHex, texture);
                
                if (!material) {
                    self.log(`Material not found for color ${colorHex}, texture ${texture}`);
                    resolve({
                        available: false,
                        reason: 'חומר לא נמצא במערכת'
                    });
                    return;
                }
                
                if (!material.in_stock || material.qty_available <= 0) {
                    resolve({
                        available: false,
                        reason: 'חומר לא במלאי',
                        material: material.name
                    });
                    return;
                }
                
                if (requiredWeightGrams <= 0) {
                    resolve({
                        available: true,
                        material: material.name
                    });
                    return;
                }
                
                const availableGrams = material.qty_available * 1000;
                
                if (availableGrams < requiredWeightGrams) {
                    resolve({
                        available: false,
                        reason: 'לא נותר מספיק חומר במלאי',
                        material: material.name
                    });
                    return;
                }
                
                self.log(`Material ${material.name}: sufficient stock available`);
                
                resolve({
                    available: true,
                    material: material.name
                });
                
            } catch (error) {
                self.log("Error checking availability", error);
                resolve({
                    available: false,
                    reason: 'שגיאה בבדיקת זמינות'
                });
            }
        });
    },
    
    
    calculatePrice: function(height, width, colorHex, texture) {
        const self = this;
        return new Promise(function(resolve) {
            try {
                texture = texture || 'smooth';
                
                self.log(`Calculating price for: ${height}cm x ${width}cm, color: ${colorHex}, texture: ${texture}`);
                
                const material = self.findMaterialByColor(colorHex, texture);
                
                if (!material) {
                    self.log(`No material found for color ${colorHex}, texture ${texture}`);
                    resolve(null);
                    return;
                }
                
                const h = parseFloat(height) || 15;
                const w = parseFloat(width) || 15;
                
                
                const wallThickness = 0.4; 
                const bottomThickness = 0.6; 
                
                const externalRadius = w / 2;
                const internalRadius = Math.max(0, externalRadius - wallThickness);
                const externalVolume = Math.PI * Math.pow(externalRadius, 2) * h;
                const internalHeight = Math.max(0, h - bottomThickness);
                const internalVolume = Math.PI * Math.pow(internalRadius, 2) * internalHeight;
                
                let materialVolumeCm3 = externalVolume - internalVolume;
                
                
                const baseInfillPercentage = 0.20; 
                const supportMaterialFactor = 1.15; 
                const wasteFactor = 1.10;
                
                materialVolumeCm3 = materialVolumeCm3 * (1 + baseInfillPercentage) * supportMaterialFactor * wasteFactor;
                
                
                let textureFactor = 1.0;
                if (texture === 'rough') {
                    textureFactor = 1.05; 
                } else if (texture === 'matte') {
                    textureFactor = 1.08; 
                }
                
                const totalVolumeCm3 = materialVolumeCm3 * textureFactor;
                const plasDensity = 1.24; 
                const materialWeightGrams = totalVolumeCm3 * plasDensity;
                
               
                let sizeFactor = 1.0;
                const jarVolume = Math.PI * Math.pow(externalRadius, 2) * h;
                
                if (jarVolume < 1000) {
                    sizeFactor = 1.20; 
                } else if (jarVolume > 5000) {
                    sizeFactor = 1.15; 
                }
                
                const basePricePerGram = parseFloat(material.price) || 0.15;
                const adjustedPricePerGram = basePricePerGram * sizeFactor;
                
                let totalPrice = materialWeightGrams * adjustedPricePerGram;
                
                
                const designCost = 8; 
                const printingCost = h * 0.5;
                
                totalPrice += designCost + printingCost;
                
                
                const minPrice = 15;
                const finalPrice = Math.max(Math.ceil(totalPrice * 2) / 2, minPrice);
                
                self.log(`Calculated price: ${finalPrice} NIS for ${h}x${w}cm vase`);
                
                resolve({
                    price: finalPrice,
                    material: material,
                    weightGrams: materialWeightGrams,
                    volumeCm3: totalVolumeCm3
                });
                
            } catch (error) {
                self.log("Error calculating price", error);
                resolve(null);
            }
        });
    },
    
    
    createOrder: function(formData, cartItems) {
        const self = this;
        return new Promise(async function(resolve) {
            try {
                self.log("Creating order in Odoo", { cartItems: cartItems.length });
                
                if (!self.connected) {
                    self.log("Not connected to Odoo, skipping order creation");
                    resolve({
                        success: false,
                        error: "Not connected to Odoo"
                    });
                    return;
                }
                
                
                const orderData = {
                    order_data: formData,
                    cart_items: cartItems
                };
                
                const response = await fetch(self.proxyUrl + '?endpoint=create_order', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(orderData),
                    credentials: 'same-origin'
                });
                
                if (!response.ok) {
                    resolve({
                        success: false,
                        error: `HTTP ${response.status}: ${response.statusText}`
                    });
                    return;
                }
                
                const result = await response.json();
                
                if (result.error) {
                    resolve({
                        success: false,
                        error: result.error
                    });
                    return;
                }
                
                if (result.result && result.result.order_id) {
                    self.log("Order created successfully", result.result);
                    resolve({
                        success: true,
                        orderId: result.result.order_id,
                        orderNumber: result.result.order_number
                    });
                    return;
                }
                
                resolve({
                    success: false,
                    error: "Invalid response from order creation"
                });
                
            } catch (error) {
                self.log("Error creating order", error);
                resolve({
                    success: false,
                    error: error.message
                });
            }
        });
    },
    
    
    completeOrder: function(formData, cartItems) {
        const self = this;
        return new Promise(async function(resolve) {
            try {
                self.log("Completing order and updating inventory");
                
                if (!self.connected) {
                    self.log("Not connected to Odoo, skipping inventory update");
                    resolve({
                        success: false,
                        error: "Not connected to Odoo",
                        inventoryUpdates: []
                    });
                    return;
                }
                
                const inventoryUpdates = [];
                let allUpdatesSuccessful = true;
                
                
                for (const item of cartItems) {
                    try {
                        const priceData = await self.calculatePrice(
                            item.height,
                            item.width,
                            item.color,
                            item.texture
                        );
                        
                        if (!priceData) {
                            self.log(`Could not calculate material usage for item ${item.id}`);
                            continue;
                        }
                        
                        const material = priceData.material;
                        const usedWeightGrams = priceData.weightGrams;
                        const usedWeightKg = usedWeightGrams / 1000; 
                        

                        const inventoryData = {
                            material_id: material.id,
                            used_quantity: usedWeightKg
                        };
                        
                        const response = await fetch(self.proxyUrl + '?endpoint=update_inventory', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json'
                            },
                            body: JSON.stringify(inventoryData),
                            credentials: 'same-origin'
                        });
                        
                        if (response.ok) {
                            const result = await response.json();
                            
                            if (result.result && result.result.success) {
                                inventoryUpdates.push({
                                    materialId: material.id,
                                    materialName: material.name,
                                    usedWeight: usedWeightGrams,
                                    newQuantity: result.result.new_quantity
                                });
                                
                                self.log(`Inventory updated for ${material.name}: used ${usedWeightGrams}g`);
                                

                                const localMaterial = self.materials.find(m => m.id === material.id);
                                if (localMaterial) {
                                    localMaterial.qty_available = result.result.new_quantity;
                                    localMaterial.in_stock = result.result.new_quantity > 0;
                                }
                            } else {
                                self.log(`Failed to update inventory for ${material.name}`, result.error);
                                allUpdatesSuccessful = false;
                            }
                        } else {
                            self.log(`HTTP error updating inventory for ${material.name}`, response.status);
                            allUpdatesSuccessful = false;
                        }
                        
                    } catch (error) {
                        self.log(`Error processing item ${item.id}`, error);
                        allUpdatesSuccessful = false;
                    }
                }
                
                resolve({
                    success: allUpdatesSuccessful,
                    inventoryUpdates: inventoryUpdates,
                    error: allUpdatesSuccessful ? null : "Some inventory updates failed"
                });
                
            } catch (error) {
                self.log("Error completing order", error);
                resolve({
                    success: false,
                    error: error.message,
                    inventoryUpdates: []
                });
            }
        });
    },
    
    
    getStatus: function() {
        return {
            connected: this.connected,
            uid: this.uid,
            materialsLoaded: this.materialsLoaded,
            materialsCount: this.materials.length,
            lastError: this.lastError,
            proxyUrl: this.proxyUrl
        };
    }
};

SimpleOdooClient.init();

window.simpleOdooClient = SimpleOdooClient;
window.odooClient = SimpleOdooClient;

window.testOdooNew = function() {
    console.log("=== ODOO CLIENT STATUS ===");
    console.table(SimpleOdooClient.getStatus());
    console.log("Materials:", SimpleOdooClient.materials);
    return SimpleOdooClient.getStatus();
};

window.testPriceNew = function(height, width, color, texture) {
    return SimpleOdooClient.calculatePrice(
        height || 15, 
        width || 15, 
        color || "#f14a4a",
        texture || 'smooth'
    );
};

window.testOrderNew = function() {
    const testFormData = "name=Test&email=test@example.com";
    const testCartItems = [{
        id: 1,
        height: 15,
        width: 15,
        color: "#f14a4a",
        texture: "smooth",
        price: 25
    }];
    
    return SimpleOdooClient.createOrder(testFormData, testCartItems);
};

console.log("✅ Complete Odoo Client loaded and initialized");
console.log("Available commands: testOdooNew(), testPriceNew(h,w,color,texture), testOrderNew()");