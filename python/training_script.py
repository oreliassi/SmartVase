from ultralytics import YOLO
import yaml
import os
import shutil
import argparse
import torch

def setup_custom_training(config_path, output_dir="runs/custom_train"):
    """
    Set up a custom training run with modified YOLO configuration
    
    Args:
        config_path: Path to the modified YOLO config file
        output_dir: Directory to save training outputs
    """
    # Create output directory if it doesn't exist
    os.makedirs(output_dir, exist_ok=True)
    
    # Copy config to output directory
    shutil.copy(config_path, os.path.join(output_dir, "config.yaml"))
    
    # Load configuration
    with open(config_path, 'r') as f:
        config = yaml.safe_load(f)
    
    return config

def train_model(config, config_path, model_size="yolov8n.pt", epochs=100, batch_size=16, imgsz=640, resume=False):
    # Initialize model
    model = YOLO(model_size)
    
    # Prepare class weights if specified
    if "class_weights" in config:
        class_weights = list(config["class_weights"].values())
    else:
        class_weights = None
    
    # Set up training parameters
    train_args = {
        'data': config_path,
        'epochs': epochs,
        'batch': batch_size,
        'imgsz': imgsz,
        'patience': 20,  # Early stopping patience
        'device': '0' if torch.cuda.is_available() else 'cpu',
        'workers': 8,
        'resume': resume,
        'val': True,
        'save': True,
        'exist_ok': True  # Overwrite existing experiment
    }
    
    # Add hyperparameters if specified
    if "hyp" in config:
        for key, value in config["hyp"].items():
            train_args[key] = value
    
    # Add class weights if specified
    if class_weights:
        train_args['cls_weights'] = class_weights
    
    # Start training
    results = model.train(**train_args)
    
    return results, model

def validate_model(model, data_yaml, conf=0.25):
    """
    Validate the trained model
    
    Args:
        model: Trained YOLO model
        data_yaml: Path to data.yaml file
        conf: Confidence threshold
    """
    results = model.val(data=data_yaml, conf=conf)
    return results

def export_model(model, format="onnx"):
    """
    Export the model to the specified format
    
    Args:
        model: Trained YOLO model
        format: Export format (onnx, torchscript, etc.)
    """
    model.export(format=format)

def main():
    # Parse command line arguments
    parser = argparse.ArgumentParser(description="Train YOLO model with custom configuration")
    parser.add_argument('--config', type=str, default='custom_config.yaml', help='Path to custom config file')
    parser.add_argument('--model', type=str, default='yolov8n.pt', help='Base model to use')
    parser.add_argument('--epochs', type=int, default=100, help='Number of training epochs')
    parser.add_argument('--batch', type=int, default=16, help='Batch size')
    parser.add_argument('--imgsz', type=int, default=640, help='Image size')
    parser.add_argument('--resume', action='store_true', help='Resume training')
    parser.add_argument('--export', action='store_true', help='Export model after training')
    parser.add_argument('--export-format', type=str, default='onnx', help='Export format')
    args = parser.parse_args()
    
    # Set up training
    config_path = args.config
    config = setup_custom_training(config_path)
    
    # Train model
    results, model = train_model(
        config, 
        config_path=config_path,  # Add this parameter
        model_size=args.model,
        epochs=args.epochs, 
        batch_size=args.batch,
        imgsz=args.imgsz,
        resume=args.resume
    )
    
    # Validate model
    validation_results = validate_model(model, config_path)
    
    # Print results
    print(f"Training completed. Results: {results}")
    print(f"Validation results: {validation_results}")
    
    # Export model if requested
    if args.export:
        export_model(model, format=args.export_format)
        print(f"Model exported in {args.export_format} format")

if __name__ == "__main__":
    main()