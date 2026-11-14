
/** Decode embedded files without changing the source. Invalid input stops the save. */
export function decodeEmbeddedDataUrl(value:string):Blob {
  const comma=value.indexOf(',');
  if(!value.startsWith('data:')||comma<0) throw Error('Archivo embebido inválido. Conserva una copia local antes de corregirlo.');
  const header=value.slice(5,comma),body=value.slice(comma+1);
  const mime=header.split(';')[0]||'text/plain';
  try {
    let bytes:Uint8Array;
    if(/;base64$/i.test(header)) {
      const binary=atob(body);bytes=Uint8Array.from(binary,c=>c.charCodeAt(0));
    } else {
      const values:number[]=[];
      for(let i=0;i<body.length;) {
        if(body[i]==='%') {
          const hex=body.slice(i+1,i+3);
          if(!/^[0-9a-f]{2}$/i.test(hex)) throw Error('Invalid encoding');
          values.push(parseInt(hex,16));i+=3;
        } else {
          const cp=String.fromCodePoint(body.codePointAt(i)!);
          values.push(...new TextEncoder().encode(cp));i+=cp.length;
        }
      }
      bytes=Uint8Array.from(values);
    }
    return new Blob([bytes as Uint8Array<ArrayBuffer>],{type:mime});
  } catch {
    throw Error('No se pudo leer un archivo embebido. No se inició la subida. Conserva la copia original; no borres la caché.');
  }
}
export function validateEmbeddedDataUrls(value:unknown):void {
  if(typeof value==='string'&&value.startsWith('data:')) {decodeEmbeddedDataUrl(value);return;}
  if(Array.isArray(value)) {value.forEach(validateEmbeddedDataUrls);return;}
  if(value&&typeof value==='object') Object.values(value as Record<string,unknown>).forEach(validateEmbeddedDataUrls);
}
