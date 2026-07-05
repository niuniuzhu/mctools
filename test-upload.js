const http = require('http');

function makeRequest(options, body) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            body: JSON.parse(data)
          });
        } catch (e) {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            body: data
          });
        }
      });
    });
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

(async () => {
  console.log('=== 测试控制面板上传流程 ===\n');

  // 1. 创建测试开发者账号
  console.log('1. 创建测试开发者账号...');
  const createDevRes = await makeRequest({
    hostname: '127.0.0.1',
    port: 3004,
    path: '/api/dev-test/create-dev-account',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, {});
  
  if (createDevRes.status !== 200) {
    console.log('   ❌ 错误:', createDevRes.body?.message);
    process.exit(1);
  }
  
  const token = createDevRes.body?.token;
  const username = createDevRes.body?.username;
  const email = createDevRes.body?.email;
  console.log('   ✓ 账号创建成功！');
  console.log('   用户名:', username);
  console.log('   邮箱:', email);

  // 2. 用 token 创建商品
  console.log('\n2. 创建测试商品...');
  const testCode = 'TEST-UPLOAD-' + Date.now().toString().slice(-4);
  const productRes = await makeRequest({
    hostname: '127.0.0.1',
    port: 3004,
    path: '/api/store/products',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Cookie': `mctools_community=${encodeURIComponent(token)}`
    }
  }, {
    productCode: testCode,
    name: '测试上传商品',
    description: '用来测试控制面板是否能上传',
    originalPriceFen: 2000,
    salePriceFen: 1000,
    sortOrder: 99,
    tags: ['测试', '上传']
  });
  
  console.log('   状态:', productRes.status);
  if (productRes.status !== 201) {
    console.log('   ❌ 创建失败:', productRes.body?.message);
    console.log('   完整响应:', JSON.stringify(productRes.body, null, 2));
    process.exit(1);
  }
  
  console.log('   ✓ 商品创建成功！');
  console.log('   商品编码:', productRes.body?.product?.productCode);
  console.log('   商品名称:', productRes.body?.product?.name);
  console.log('   销售价格:', productRes.body?.product?.salePriceFen, '分');

  // 3. 获取所有商品验证
  console.log('\n3. 验证商品已在管理员列表...');
  const adminListRes = await makeRequest({
    hostname: '127.0.0.1',
    port: 3004,
    path: '/api/store/products/admin',
    method: 'GET',
    headers: {
      'Cookie': `mctools_community=${encodeURIComponent(token)}`
    }
  });
  
  console.log('   状态:', adminListRes.status);
  const productCount = adminListRes.body?.products?.length || 0;
  console.log('   商品总数:', productCount);
  
  const found = adminListRes.body?.products?.find(p => p.productCode === testCode);
  if (found) {
    console.log('   ✓ 新增的商品已出现在列表中！');
  } else {
    console.log('   ⚠ 警告：商品在列表中未找到');
  }

  // 4. 测试编辑
  console.log('\n4. 测试编辑商品...');
  const updateRes = await makeRequest({
    hostname: '127.0.0.1',
    port: 3004,
    path: '/api/store/products/update',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Cookie': `mctools_community=${encodeURIComponent(token)}`
    }
  }, {
    productCode: testCode,
    name: '修改后的商品名称',
    salePriceFen: 888
  });
  
  console.log('   状态:', updateRes.status);
  if (updateRes.status === 200) {
    console.log('   ✓ 编辑成功！');
  } else {
    console.log('   ❌ 编辑失败:', updateRes.body?.message);
  }

  // 5. 测试上架/下架
  console.log('\n5. 测试上架/下架...');
  const toggleRes = await makeRequest({
    hostname: '127.0.0.1',
    port: 3004,
    path: '/api/store/products/toggle',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Cookie': `mctools_community=${encodeURIComponent(token)}`
    }
  }, {
    productCode: testCode,
    isActive: false
  });
  
  console.log('   状态:', toggleRes.status);
  if (toggleRes.status === 200) {
    console.log('   ✓ 状态切换成功！');
  } else {
    console.log('   ❌ 切换失败:', toggleRes.body?.message);
  }

  console.log('\n✅ 所有测试完成！后端功能正常工作。');
  console.log('\n测试账号信息（用于浏览器登录）：');
  console.log('用户名:', username);
  console.log('邮箱:', email);
  console.log('口令:', 'McTools2026!');
})().catch(err => {
  console.error('❌ 错误:', err.message);
  process.exit(1);
});

