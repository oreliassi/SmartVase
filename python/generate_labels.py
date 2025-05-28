import os

# נתיבים
images_train_dir = 'yolo/images/train'
labels_train_dir = 'yolo/labels/train'
images_val_dir = 'yolo/images/val'
labels_val_dir = 'yolo/labels/val'

# מיפוי של קלאסים לפי שם
class_mapping = {
    'clean': 0,
    'layer': 1,
    'spaghetti': 2
}

def create_label_for_image(image_path, label_dir):
    filename = os.path.basename(image_path)
    name, _ = os.path.splitext(filename)
    label_file = os.path.join(label_dir, f"{name}.txt")
    
    # אם כבר יש קובץ - לא לעשות כלום
    if os.path.exists(label_file):
        return
    
    # יצירת קובץ חדש
    with open(label_file, 'w') as f:
        if 'clean' in name.lower():
            pass  # קובץ ריק
        elif 'layer' in name.lower():
            f.write('1 0.5 0.5 0.5 0.5\n')  # תיבת סימון גנרית
        elif 'spaghetti' in name.lower():
            f.write('2 0.5 0.5 0.5 0.5\n')  # תיבת סימון גנרית
        else:
            pass  # אם לא ברור מה סוג התמונה - לא עושים כלום

def create_labels(images_dir, labels_dir):
    os.makedirs(labels_dir, exist_ok=True)
    for filename in os.listdir(images_dir):
        if filename.endswith('.jpg') or filename.endswith('.png'):
            image_path = os.path.join(images_dir, filename)
            create_label_for_image(image_path, labels_dir)

# יצירת קבצים רק אם חסרים
create_labels(images_train_dir, labels_train_dir)
create_labels(images_val_dir, labels_val_dir)

print("✅ קבצי TXT חדשים נוצרו רק לתמונות ללא קובץ תיוג.")
