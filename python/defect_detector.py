import os
import sys
import cv2
import numpy as np
import argparse
from ultralytics import YOLO
import torch
import yaml
from datetime import datetime

# Import our custom detector
from spaghetti_detector import SpaghettiDetector

class PrintDefectDetector:
    def __init__(self, yolo_model_path=None, custom_config=None, confidence=0.25):
        """
        Initialize the 3D print defect detector that combines regular YOLO
        with specialized spaghetti detection
        
        Args:
            yolo_model_path: Path to the trained YOLO model
            custom_config: Path to custom configuration
            confidence: Detection confidence threshold
        """
        # Load base YOLO model
        self.base_model = YOLO(yolo_model_path) if yolo_model_path else None
        
        # Load configuration if provided
        self.config = None
        if custom_config and os.path.exists(custom_config):
            with open(custom_config, 'r') as f:
                self.config = yaml.safe_load(f)
                
            # Apply config settings to model if both are provided
            if self.base_model and self.config and "detect" in self.config:
                # Apply detection thresholds from config
                self.conf_thres = self.config["detect"].get("conf_thres", confidence)
                self.iou_thres = self.config["detect"].get("iou_thres", 0.45)
            else:
                self.conf_thres = confidence
                self.iou_thres = 0.45
        else:
            self.conf_thres = confidence
            self.iou_thres = 0.45
        
        # Initialize specialized spaghetti detector
        self.spaghetti_detector = SpaghettiDetector(yolo_model_path, confidence=self.conf_thres)
        
        # Detection class names
        self.class_names = {0: "clean", 1: "layer", 2: "spaghetti"}
        if self.config and "names" in self.config:
            self.class_names = self.config["names"]
            
        # Initialize device
        self.device = 'cuda' if torch.cuda.is_available() else 'cpu'
        print(f"Using device: {self.device}")

    def detect_defects(self, image_path, save_output=True, output_dir="output"):
        """
        Detect defects in a 3D print image
        
        Args:
            image_path: Path to the image
            save_output: Whether to save the output image
            output_dir: Directory to save output
            
        Returns:
            results: Dictionary with detection results
        """
        # Check if image exists
        if not os.path.exists(image_path):
            print(f"Error: Image not found at {image_path}")
            return None
        
        # Read image
        image = cv2.imread(image_path)
        if image is None:
            print(f"Error: Could not read image at {image_path}")
            return None
        
        # Use specialized detector with focus on spaghetti
        results = self.spaghetti_detector.detect_with_specialized_focus(image)
        
        # Create a summary of defects
        defects_summary = {
            "filename": os.path.basename(image_path),
            "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            "defects_detected": []
        }
           # Add base detections to summary
        for detection in results["base_detections"].boxes:
            raw_class_id = int(detection.cls)
            normalized_class_id = raw_class_id % 3  # Adjust to match YOLO class index
            print("Detected class_id (raw):", raw_class_id)
            print("Converted to YOLO class index:", normalized_class_id)

            conf = float(detection.conf)
            bbox = detection.xyxy[0].tolist()  # [x1, y1, x2, y2]

            # Use normalized class ID to get proper label name
            defect_type = self.class_names.get(normalized_class_id, f"unknown_id_{raw_class_id}")
            defects_summary["defects_detected"].append({
                "type": defect_type,
                "confidence": conf,
                "bbox": bbox
            })

        
        # Add spaghetti detection to summary if detected
        if results["spaghetti_detected"]:
            # Check if spaghetti is already in the list
            if not any(d["type"] == "spaghetti" for d in defects_summary["defects_detected"]):
                defects_summary["defects_detected"].append({
                    "type": "spaghetti",
                    "confidence": 0.9,  # Hardcoded high confidence for specialized detection
                    "bbox": [0, 0, image.shape[1], int(image.shape[0] * 0.3)]  # Top portion
                })
        
        # Save output if requested
        if save_output:
            os.makedirs(output_dir, exist_ok=True)
            output_path = os.path.join(output_dir, f"detected_{os.path.basename(image_path)}")
            cv2.imwrite(output_path, results["annotated_image"])
            
            # Also save a JSON summary
            json_path = os.path.splitext(output_path)[0] + ".json"
            import json
            with open(json_path, 'w') as f:
                json.dump(defects_summary, f, indent=4)
            
            print(f"Output saved to {output_path} and {json_path}")
        
        return {
            "annotated_image": results["annotated_image"],
            "summary": defects_summary
        }
    
    def analyze_video(self, video_path, save_output=True, output_dir="output"):
        """
        Analyze a video of 3D printing for defects
        
        Args:
            video_path: Path to the video
            save_output: Whether to save the output video
            output_dir: Directory to save output
            
        Returns:
            results: Dictionary with analysis results
        """
        # Check if video exists
        if not os.path.exists(video_path):
            print(f"Error: Video not found at {video_path}")
            return None
        
        # Open video
        cap = cv2.VideoCapture(video_path)
        if not cap.isOpened():
            print(f"Error: Could not open video at {video_path}")
            return None
        
        # Get video properties
        fps = cap.get(cv2.CAP_PROP_FPS)
        width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
        height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
        frame_count = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        
        # Create output video writer if saving output
        output_video = None
        if save_output:
            os.makedirs(output_dir, exist_ok=True)
            output_path = os.path.join(output_dir, f"analyzed_{os.path.basename(video_path)}")
            fourcc = cv2.VideoWriter_fourcc(*'mp4v')  # Codec
            output_video = cv2.VideoWriter(output_path, fourcc, fps, (width, height))
        
        # Initialize analysis results
        analysis_results = {
            "filename": os.path.basename(video_path),
            "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            "duration_seconds": frame_count / fps if fps > 0 else 0,
            "defects_by_frame": {},
            "summary": {
                "total_frames": frame_count,
                "frames_with_defects": 0,
                "defect_counts": {
                    "clean": 0,
                    "layer": 0,
                    "spaghetti": 0
                }
            }
        }
        
        # Process each frame
        frame_index = 0
        while True:
            ret, frame = cap.read()
            if not ret:
                break
                
            # Process every 5th frame to speed up analysis
            if frame_index % 5 == 0:
                print(f"Processing frame {frame_index}/{frame_count}")
                
                # Detect defects in the frame
                results = self.spaghetti_detector.detect_with_specialized_focus(frame)
                
                # Record defects for this frame
                frame_defects = []
                
                # Add base detections
                for detection in results["base_detections"].boxes:
                    raw_class_id = int(detection.cls)
                    normalized_class_id = raw_class_id % 3
                    print("Detected class_id (raw):", raw_class_id)
                    print("Converted to YOLO class index:", normalized_class_id)

                    conf = float(detection.conf)

                    defect_type = self.class_names.get(normalized_class_id, f"unknown_id_{raw_class_id}")
                    frame_defects.append({
                        "type": defect_type,
                        "confidence": conf
                    })

                    
                    # Update summary counts
                    if defect_type in analysis_results["summary"]["defect_counts"]:
                        analysis_results["summary"]["defect_counts"][defect_type] += 1
                
                # Add spaghetti detection if detected
                if results["spaghetti_detected"]:
                    if not any(d["type"] == "spaghetti" for d in frame_defects):
                        frame_defects.append({
                            "type": "spaghetti",
                            "confidence": 0.9
                        })
                        # Update summary count
                        analysis_results["summary"]["defect_counts"]["spaghetti"] += 1
                
                # Save frame defects
                if frame_defects:
                    analysis_results["defects_by_frame"][frame_index] = frame_defects
                    analysis_results["summary"]["frames_with_defects"] += 1
                
                # Write frame to output video if saving
                if output_video is not None:
                    output_video.write(results["annotated_image"])
            
            # Write original frame for non-processed frames
            elif output_video is not None:
                output_video.write(frame)
                
            frame_index += 1
        
        # Release video resources
        cap.release()
        if output_video is not None:
            output_video.write(frame)
            output_video.release()
            
        # Save analysis summary if requested
        if save_output:
            json_path = os.path.join(output_dir, f"analysis_{os.path.splitext(os.path.basename(video_path))[0]}.json")
            import json
            with open(json_path, 'w') as f:
                json.dump(analysis_results, f, indent=4)
            
            print(f"Analysis summary saved to {json_path}")
        
        return analysis_results

    def batch_process_directory(self, directory, save_output=True, output_dir="output", recursive=False):
        """
        Process all images in a directory
        
        Args:
            directory: Directory containing images
            save_output: Whether to save output images
            output_dir: Directory to save outputs
            recursive: Whether to search subdirectories
            
        Returns:
            results: Dictionary with processing results
        """
        # Check if directory exists
        if not os.path.exists(directory):
            print(f"Error: Directory not found at {directory}")
            return None
        
        # Get all image files
        image_extensions = ['.jpg', '.jpeg', '.png', '.bmp']
        video_extensions = ['.mp4', '.avi', '.mov']
        
        files = []
        if recursive:
            for root, _, filenames in os.walk(directory):
                for filename in filenames:
                    ext = os.path.splitext(filename)[1].lower()
                    if ext in image_extensions or ext in video_extensions:
                        files.append(os.path.join(root, filename))
        else:
            files = [os.path.join(directory, f) for f in os.listdir(directory) 
                    if os.path.isfile(os.path.join(directory, f)) and 
                    os.path.splitext(f)[1].lower() in image_extensions + video_extensions]
        
        # Process each file