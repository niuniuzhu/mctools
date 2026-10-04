const base = 'http://localhost:3004';

(async () => {
  const devResponse = await fetch(base + '/api/dev-test/create-dev-account', { method: 'POST' });
  const devJson = await devResponse.json();
  const token = devJson.token;

  const saveResponse = await fetch(base + '/api/store/settings', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: 'Bearer ' + token
    },
    body: JSON.stringify({
      maintenanceEnabled: true,
      paymentsEnabled: false,
      announcement: 'x',
      whitelistUsernames: ['a'],
      maintenanceMessage: 'msg',
      maintenanceReason: 'r',
      maintenanceUntil: '',
      orderViewerUsernames: []
    })
  });
  const saveJson = await saveResponse.json();
  console.log('save status', saveResponse.status, JSON.stringify(saveJson));

  const readResponse = await fetch(base + '/api/store/settings', {
    headers: { Authorization: 'Bearer ' + token }
  });
  const readJson = await readResponse.json();
  console.log('read status', readResponse.status, JSON.stringify({
    maintenanceEnabled: readJson.maintenanceEnabled,
    paymentsEnabled: readJson.paymentsEnabled
  }));
})();
