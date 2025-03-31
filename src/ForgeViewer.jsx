import { useEffect } from 'react';

function ForgeViewer({ urn }) {
  useEffect(() => {
    const options = {
      env: 'AutodeskProduction',
      accessToken: '<<PASTE_YOUR_ACCESS_TOKEN_HERE>>', // צריך לקבל מהשרת או זמנית דרך Postman
    };

    Autodesk.Viewing.Initializer(options, () => {
      const viewerDiv = document.getElementById('forgeViewer');
      const viewer = new Autodesk.Viewing.GuiViewer3D(viewerDiv);
      viewer.start();

      const documentId = 'urn:' + urn;
      Autodesk.Viewing.Document.load(documentId, (doc) => {
        const defaultModel = doc.getRoot().getDefaultGeometry();
        viewer.loadDocumentNode(doc, defaultModel);
      });
    });
  }, [urn]);

  return <div id="forgeViewer" style={{ width: '100%', height: '400px' }} />;
}

export default ForgeViewer;
