import { useEffect, useState } from 'react';
import { db } from "./firebase";
import { collection, getDocs } from "firebase/firestore";



function App() {
  const [docs, setDocs] = useState([]);

  useEffect(() => {
    async function fetchData() {
      const querySnapshot = await getDocs(collection(db, "test"));
      if (querySnapshot.empty) {
        console.log("No documents found in the 'test' collection.");
        return;
      }
      const docsData = [];
      querySnapshot.forEach(doc => {
        docsData.push({ id: doc.id, ...doc.data() });
      });
  
      setDocs(docsData);
    }
    fetchData();
  }, []);

  return (
    <div>
      <h2>Test Collection</h2>
      <ul>
        {docs.map(doc => (
          <li key={doc.id}>
            <div>
              <strong>{doc.id}</strong>: {JSON.stringify(doc)}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default App;