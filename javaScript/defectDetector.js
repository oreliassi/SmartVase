
class DefectDetector {
    constructor() {
      this.model = null;
      this.isModelLoaded = false;
      this.isDetecting = false;
      this.videoElement = null;
      this.canvas = null;
      this.ctx = null;
      this.onDefectDetected = null;
      this.lastDetectionTime = 0;
      this.detectionInterval = 200; 
      
     
      this.classNames = [
        'layer_shift',
        'stringing',
        'under_extrusion',
        'warping',
        'blob'
      ];
    }
  
    async loadModel() {
        try {
          console.log('Loading YOLOv8 model...');
          
          this.model = await tf.loadGraphModel('../yolo/model/model.json');
          
          console.log('YOLOv8 model loaded successfully');
          this.isModelLoaded = true;
          
          const dummyInput = tf.zeros([1, 640, 640, 3]);
          const warmupResult = await this.model.predict(dummyInput);
          if (Array.isArray(warmupResult)) {
            warmupResult.forEach(tensor => tensor.dispose());
          } else {
            warmupResult.dispose();
          }
          dummyInput.dispose();
          
          return true;
        } catch (error) {
          console.error('Error loading YOLOv8 model:', error);
          return false;
        }
      }
  
    setupVideo(videoElement, onDefectDetected) {
      this.videoElement = videoElement;
      this.onDefectDetected = onDefectDetected;
      
      this.canvas = document.createElement('canvas');
      this.ctx = this.canvas.getContext('2d');
    }
  
    startDetection() {
      if (!this.isModelLoaded) {
        console.warn('Model not loaded yet, cannot start detection');
        return false;
      }
  
      if (!this.videoElement) {
        console.warn('Video element not set, cannot start detection');
        return false;
      }
  
     
      this.updateCanvasDimensions();
      
      this.isDetecting = true;
      this.detectFrame();
      return true;
    }
  
    updateCanvasDimensions() {
      
      const width = this.videoElement.videoWidth || 640;
      const height = this.videoElement.videoHeight || 480;
      
      if (this.canvas.width !== width || this.canvas.height !== height) {
        this.canvas.width = width;
        this.canvas.height = height;
        console.log(`Canvas resized to ${width}x${height}`);
      }
    }
  
    stopDetection() {
      this.isDetecting = false;
    }
  
    async detectFrame() {
      if (!this.isDetecting || this.videoElement.paused || this.videoElement.ended) {
        return;
      }
  
      const now = Date.now();
      
      if (now - this.lastDetectionTime >= this.detectionInterval && 
          this.videoElement.readyState >= 2) {
        
        this.lastDetectionTime = now;
        
        try {
          
          this.updateCanvasDimensions();
          
          
          this.ctx.drawImage(this.videoElement, 0, 0, this.canvas.width, this.canvas.height);
          
          
          const imageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
          
          
          const [inputTensor, paddedInfo] = this.preprocessImage(imageData);
          
          
          const predictions = await this.model.predict(inputTensor);
          
          
          const defects = this.processYOLOv8Predictions(predictions, paddedInfo);
          
          
          if (defects.length > 0) {
            console.log('Defects detected:', defects);
            if (this.onDefectDetected) {
              this.onDefectDetected(defects);
            }
          }
          
          
          inputTensor.dispose();
          if (Array.isArray(predictions)) {
            predictions.forEach(tensor => tensor.dispose());
          } else {
            predictions.dispose();
          }
        } catch (error) {
          console.error('Error in defect detection:', error);
        }
      }
      
      
      if (this.isDetecting) {
        requestAnimationFrame(() => this.detectFrame());
      }
    }
  
    preprocessImage(imageData) {
      
      const originalWidth = imageData.width;
      const originalHeight = imageData.height;
      
      
      const targetSize = 640;
      
      const scale = Math.min(targetSize / originalWidth, targetSize / originalHeight);
      const newWidth = Math.floor(originalWidth * scale);
      const newHeight = Math.floor(originalHeight * scale);
      
      const paddingX = targetSize - newWidth;
      const paddingY = targetSize - newHeight;
      const paddingTop = Math.floor(paddingY / 2);
      const paddingLeft = Math.floor(paddingX / 2);
      
      const tensor = tf.browser.fromPixels(imageData);
      
      const resized = tf.image.resizeBilinear(tensor, [newHeight, newWidth]);
      
      const padded = tf.pad(
        resized,
        [[paddingTop, paddingY - paddingTop], [paddingLeft, paddingX - paddingLeft], [0, 0]]
      );
      
      const normalized = padded.div(255.0);
      
      const batched = normalized.expandDims(0);
      
      const paddingInfo = {
        scale,
        paddingTop,
        paddingLeft,
        originalWidth,
        originalHeight
      };
      
      tensor.dispose();
      resized.dispose();
      padded.dispose();
      normalized.dispose();
      
      return [batched, paddingInfo];
    }
  
    processYOLOv8Predictions(predictions, paddingInfo) {
      const defects = [];
      
      try {
     
        let detectionsTensor;
        if (Array.isArray(predictions)) {
          detectionsTensor = predictions[0];
        } else {
          detectionsTensor = predictions;
        }
        
        const detections = detectionsTensor.arraySync()[0];
        
        const confidenceThreshold = 0.5;
        
        for (let i = 0; i < detections.length; i++) {
          const detection = detections[i];
          

          
          let confidence, classId, classScore, box;
          
          if (detection.length > 6) {
            // Format 1: With class scores
            const xCenter = detection[0];
            const yCenter = detection[1];
            const width = detection[2];
            const height = detection[3];
            confidence = detection[4];
            
            let maxClassScore = 0;
            let maxClassIndex = 0;
            for (let c = 5; c < detection.length; c++) {
              if (detection[c] > maxClassScore) {
                maxClassScore = detection[c];
                maxClassIndex = c - 5;
              }
            }
            
            classId = maxClassIndex;
            classScore = maxClassScore;
            
            // Convert to [x1, y1, width, height]
            box = [
              xCenter - width / 2,  // x1
              yCenter - height / 2,  // y1
              width,
              height
            ];
          } else {
            box = [
              detection[0],  // x1
              detection[1],  // y1
              detection[2] - detection[0],  // width
              detection[3] - detection[1]   // height
            ];
            confidence = detection[4];
            classId = Math.round(detection[5]);
            classScore = confidence;
          }
          
          if (confidence < confidenceThreshold) continue;
          
          const originalBox = this.convertBoxToOriginalSize(box, paddingInfo);
          
          defects.push({
            box: originalBox,
            confidence: confidence,
            class: classId,
            classScore: classScore,
            defectType: this.classNames[classId] || `unknown_${classId}`
          });
        }
      } catch (error) {
        console.error('Error processing YOLOv8 predictions:', error);
      }
      
      return defects;
    }
  
    convertBoxToOriginalSize(box, paddingInfo) {
      const { scale, paddingTop, paddingLeft, originalWidth, originalHeight } = paddingInfo;
      
      const [x, y, boxWidth, boxHeight] = box;
      
      const x1 = (x - paddingLeft) / scale;
      const y1 = (y - paddingTop) / scale;
      const width = boxWidth / scale;
      const height = boxHeight / scale;
      
      const boundedX = Math.max(0, Math.min(x1, originalWidth));
      const boundedY = Math.max(0, Math.min(y1, originalHeight));
      const boundedWidth = Math.min(width, originalWidth - boundedX);
      const boundedHeight = Math.min(height, originalHeight - boundedY);
      
      return [boundedX, boundedY, boundedWidth, boundedHeight];
    }
    
    drawDetections(defects, targetCanvas) {
      const ctx = targetCanvas.getContext('2d');
      
      ctx.clearRect(0, 0, targetCanvas.width, targetCanvas.height);
      
      ctx.drawImage(this.videoElement, 0, 0, targetCanvas.width, targetCanvas.height);
      
      defects.forEach(defect => {
        const [x, y, width, height] = defect.box;
        
        ctx.strokeStyle = 'red';
        ctx.lineWidth = 2;
        ctx.strokeRect(x, y, width, height);
        
        const label = `${defect.defectType}: ${Math.round(defect.confidence * 100)}%`;
        const labelWidth = ctx.measureText(label).width + 10;
        const labelHeight = 20;
        
        ctx.fillStyle = 'rgba(255, 0, 0, 0.7)';
        ctx.fillRect(
          x,
          y > labelHeight ? y - labelHeight : y,
          labelWidth,
          labelHeight
        );
        
        ctx.fillStyle = 'white';
        ctx.font = '14px Arial';
        ctx.fillText(
          label,
          x + 5,
          y > labelHeight ? y - 5 : y + 15
        );
      });
    }
  }