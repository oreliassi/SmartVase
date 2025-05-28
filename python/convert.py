from ultralytics import YOLO

# טען את המודל .pt
model = YOLO("best.pt")

# המר ל־ONNX
model.export(format="onnx", opset=12)
