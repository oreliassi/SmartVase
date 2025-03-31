/*
  SmartVase - מבנה בסיסי של אפליקציית React
  - מסך התחברות
  - מסך עיצוב כדים
  - מסך ERP (בעתיד)
*/

import React, { useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import './App.css';

function LoginScreen({ onLogin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = () => {
    if (username && password) onLogin();
  };

  return (
    <div className="screen">
      <h2>התחברות למערכת</h2>
      <input
        type="text"
        placeholder="שם משתמש"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
      />
      <input
        type="password"
        placeholder="סיסמה"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      <button onClick={handleLogin}>התחבר</button>
    </div>
  );
}

function ColorPicker({ selectedColor, onSelect }) {
  const colors = ['#ffa500', '#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff', '#00ffff', '#000000', '#ffffff', '#8b4513'];
  return (
    <div className="color-picker">
      {colors.map((color) => (
        <div
          key={color}
          className={`color-box ${selectedColor === color ? 'selected' : ''}`}
          style={{ backgroundColor: color }}
          onClick={() => onSelect(color)}
        />
      ))}
    </div>
  );
}

function DesignScreen() {
  const [height, setHeight] = useState(1);
  const [color, setColor] = useState('#ffa500');
  const [texture, setTexture] = useState('smooth');
  const [engraving, setEngraving] = useState('');
  const [price, setPrice] = useState(null);
  const [cart, setCart] = useState([]);

  const handlePriceCheck = () => {
    // קריאה ל-API בהמשך
    setPrice((10 + height * 5).toFixed(2));
  };

  const handleAddToCart = () => {
    setCart([...cart, { color, height, texture, engraving }]);
    alert('הכד נוסף לעגלה!');
  };
  
  const [urn, setUrn] = useState(null);

const handleFileUpload = async (e) => {
  e.preventDefault();
  const file = e.target.model.files[0];
  const formData = new FormData();
  formData.append('model', file);

  try {
    const res = await fetch('http://localhost:3001/upload', {
      method: 'POST',
      body: formData
    });
    const data = await res.json();
    setUrn(data.urn); // שמירת URN להצגה
    alert('הקובץ הועלה בהצלחה!');
  } catch (err) {
    console.error('שגיאה בהעלאה', err);
    alert('שגיאה בהעלאה');
  }
};

  return (
    <div className="screen">
      <h2>עיצוב כד</h2>

    <form onSubmit={handleFileUpload}>
      <input type="file" name="model" accept=".stl,.obj" required />
      <button type="submit">העלה מודל תלת־ממדי</button>
    </form>


      <button>בחר כד (גלריה בהמשך)</button>

      <div style={{ height: '400px', margin: '20px 0' }}>
        <Canvas>
          <ambientLight />
          <pointLight position={[10, 10, 10]} />
          <mesh scale={[1, height, 1]}>
            <sphereGeometry args={[1, 32, 32]} />
            <meshStandardMaterial color={color} />
          </mesh>
          <OrbitControls />
        </Canvas>
      </div>

      <div>
        <label>בחר צבע:</label>
        <ColorPicker selectedColor={color} onSelect={setColor} />
      </div>

      <div>
        <label>שנה גובה: {height.toFixed(1)}x</label>
        <input type="range" min="0.5" max="2" step="0.1" value={height} onChange={(e) => setHeight(parseFloat(e.target.value))} />
      </div>

      <div>
        <label>בחר טקסטורה:</label>
        <select value={texture} onChange={(e) => setTexture(e.target.value)}>
          <option value="smooth">חלקה</option>
          <option value="rough">מחוספסת</option>
          <option value="patterned">עם תבנית</option>
        </select>
      </div>

      <div>
        <label>הכנס טקסט לחריטה:</label>
        <input type="text" value={engraving} onChange={(e) => setEngraving(e.target.value)} />
      </div>

      <div style={{ margin: '10px' }}>
        <button onClick={handlePriceCheck}>חשב מחיר</button>
        {price && <p>מחיר: ₪{price}</p>}
      </div>

      <button>הזמן עכשיו</button>
      <button onClick={handleAddToCart}>הוסף לעגלה</button>
    </div>
  );
}

function App() {
  const [loggedIn, setLoggedIn] = useState(false);
  const [stage, setStage] = useState('design'); // 'login' | 'design' | 'erp'

  if (!loggedIn) return <LoginScreen onLogin={() => setLoggedIn(true)} />;
  if (stage === 'design') return <DesignScreen />;
  if (stage === 'erp') return <div className="screen">מסך ERP - בהמשך</div>;
}

export default App;
