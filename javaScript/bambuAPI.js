async function sendToBambuPrinter(filePath, fileName) {
  const formData = new FormData();
  const response = await fetch(filePath);
  const blob = await response.blob();

  formData.append("file", blob, fileName);

  try {
    const uploadResponse = await fetch("https://bced-2a0d-6fc2-5042-7400-317b-98eb-a9e3-2416.ngrok-free.app/upload", {
      method: "POST",
      body: formData,
    });

    const result = await uploadResponse.json();
    console.log("📤 תוצאה מהשרת:", result);

    if (result.error) {
      alert("שגיאה בשליחת קובץ למדפסת: " + result.error);
    } else {
      alert("הקובץ נשלח למדפסת בהצלחה!");
    }
  } catch (error) {
    console.error("⚠️ שגיאה כללית:", error);
    alert("לא ניתן לשלוח את הקובץ למדפסת. ודא שהשרת פעיל.");
  }
}

document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("order-form");
  if (form) {
    const originalHandler = form.onsubmit;

    form.addEventListener("submit", async (e) => {
      e.preventDefault();

      document.getElementById("order-form").style.display = "none";
      document.getElementById("paypal-button-container").innerHTML = "<p style='color: green;'>🔁 מבצע תשלום מדומה...</p>";
      document.getElementById("paypal-button-container").style.display = "block";
      document.getElementById("back-to-form").style.display = "block";

      await new Promise((resolve) => setTimeout(resolve, 2000));

      alert("✅ התשלום בוצע בהצלחה (מדומה)");

      const cartItems = window.cartItems || [];
      if (cartItems.length > 0) {
        const selectedModelPath = cartItems[0].model;
        const modelFileName = selectedModelPath.split("/").pop();

        sendToBambuPrinter(selectedModelPath, modelFileName);
      }
    });
  }
});
