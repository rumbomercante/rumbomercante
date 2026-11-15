// Crea la huella de la contraseña del panel. La contraseña no se guarda en ningún sitio.
import { scryptSync, randomBytes } from 'node:crypto';
import { createInterface } from 'node:readline';

function preguntarOculto(texto) {
  return new Promise((resolve) => {
    const rl = createInterface({ input: process.stdin, output: process.stdout, terminal: true });
    rl._writeToOutput = (s) => {
      if (s.includes(texto)) process.stdout.write(s);
    };
    rl.question(texto, (respuesta) => {
      rl.close();
      process.stdout.write('\n');
      resolve(respuesta);
    });
  });
}

const c1 = await preguntarOculto('Escribe la contraseña nueva del panel (no se verá al escribir): ');
const c2 = await preguntarOculto('Repítela: ');
if (c1 !== c2) {
  console.log('\nNo coinciden. Vuelve a intentarlo.');
  process.exit(1);
}
if (c1.length < 14) {
  console.log('\nDemasiado corta: usa al menos 14 caracteres (mejor una frase de 4 o 5 palabras).');
  process.exit(1);
}
const sal = randomBytes(16);
const huella = scryptSync(c1, sal, 64);
console.log('\nCopia esta línea completa en Vercel, en la variable PANEL_CLAVE_HASH:\n');
console.log(`scrypt$${sal.toString('base64')}$${huella.toString('base64')}`);
console.log('');
