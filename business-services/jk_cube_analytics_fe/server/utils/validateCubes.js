const EXPECTED_CUBES = [
  'TresCollReceiptHdr',
  // add more expected cubes here
];

const loadedCubes = new Set();

// Wrap the global cube() function
const originalCube = global.cube;

global.cube = function wrappedCube(name, definition) {
  loadedCubes.add(name);
  return originalCube(name, definition);
};

// Run validation AFTER schema is loaded
process.on('beforeExit', () => {
  const missing = EXPECTED_CUBES.filter(
    cube => !loadedCubes.has(cube)
  );

  console.log('\n🧩 Cubes registered at startup:');
  [...loadedCubes].forEach(c => console.log(`  ✅ ${c}`));

  if (missing.length > 0) {
    console.error('\n❌ Cube schema validation FAILED');
    missing.forEach(c =>
      console.error(`  ❌ Missing cube: ${c}`)
    );

    console.error('\n💥 Cube server stopped due to schema errors\n');
    process.exit(1);
  }

  console.log('\n✅ Cube schema validation PASSED\n');
});
