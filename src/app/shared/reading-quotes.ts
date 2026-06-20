export interface ReadingQuote {
    texto: string;
    autor: string;
}

const citasLectura: ReadingQuote[] = [
    {
        texto: 'El que lee mucho y anda mucho, ve mucho y sabe mucho.',
        autor: 'Miguel de Cervantes'
    },
    {
        texto: 'En algún lugar de un libro hay una frase esperándonos.',
        autor: 'Miguel de Cervantes'
    },
    {
        texto: 'No hay amigo tan leal como un libro.',
        autor: 'Ernest Hemingway'
    },
    {
        texto: 'Los libros son espejos: solo se ve en ellos lo que uno ya lleva dentro.',
        autor: 'Carlos Ruiz Zafón'
    },
    {
        texto: 'Un libro debe ser el hacha que rompa el mar helado dentro de nosotros.',
        autor: 'Franz Kafka'
    },
    {
        texto: 'La lectura es para la mente lo que el ejercicio es para el cuerpo.',
        autor: 'Joseph Addison'
    },
    {
        texto: 'Lee para vivir.',
        autor: 'Gustave Flaubert'
    },
    {
        texto: 'Siempre imaginé que el paraíso sería algún tipo de biblioteca.',
        autor: 'Jorge Luis Borges'
    },
    {
        texto: 'Los libros que el mundo llama inmorales muestran al mundo su propia vergüenza.',
        autor: 'Oscar Wilde'
    },
    {
        texto: 'Si no te gusta leer, no has encontrado el libro correcto.',
        autor: 'J. K. Rowling'
    },
    {
        texto: 'Un cuarto sin libros es como un cuerpo sin alma.',
        autor: 'Cicerón'
    },
    {
        texto: 'Hay más tesoros en los libros que en todo el botín de los piratas.',
        autor: 'Walt Disney'
    },
    {
        texto: 'Los libros son una magia portátil única.',
        autor: 'Stephen King'
    },
    {
        texto: 'Nunca confíes en nadie que no haya traído un libro consigo.',
        autor: 'Lemony Snicket'
    },
    {
        texto: 'Hasta que temí perderlo, nunca amé leer. Uno no ama respirar.',
        autor: 'Harper Lee'
    },
    {
        texto: 'Leer es soñar con los ojos abiertos.',
        autor: 'Anónimo'
    },
    {
        texto: 'Un lector vive mil vidas antes de morir.',
        autor: 'George R. R. Martin'
    },
    {
        texto: 'Quien no lee vive solo una.',
        autor: 'George R. R. Martin'
    },
    {
        texto: 'La biblioteca es una esfera cuyo centro cabal es cualquier hexágono.',
        autor: 'Jorge Luis Borges'
    },
    {
        texto: 'Las palabras son, en mi no tan humilde opinión, nuestra fuente más inagotable de magia.',
        autor: 'J. K. Rowling'
    },
    {
        texto: 'Los cuentos de hadas son más que reales.',
        autor: 'G. K. Chesterton'
    },
    {
        texto: 'Todo lo que tenemos que decidir es qué hacer con el tiempo que se nos da.',
        autor: 'J. R. R. Tolkien'
    },
    {
        texto: 'No todos los que vagan están perdidos.',
        autor: 'J. R. R. Tolkien'
    },
    {
        texto: 'La aventura merece la pena.',
        autor: 'Esopo'
    },
    {
        texto: 'El mundo está lleno de cosas mágicas que esperan pacientemente.',
        autor: 'W. B. Yeats'
    },
    {
        texto: 'La fantasía es una escapatoria necesaria.',
        autor: 'J. R. R. Tolkien'
    },
    {
        texto: 'A veces he creído hasta seis cosas imposibles antes del desayuno.',
        autor: 'Lewis Carroll'
    },
    {
        texto: 'Empieza por el principio y sigue hasta llegar al final.',
        autor: 'Lewis Carroll'
    },
    {
        texto: 'Somos de la misma materia que los sueños.',
        autor: 'William Shakespeare'
    },
    {
        texto: 'El infierno está vacío y todos los demonios están aquí.',
        autor: 'William Shakespeare'
    },
    {
        texto: 'Hay algo delicioso en escribir las primeras palabras de una historia.',
        autor: 'Beatrix Potter'
    },
    {
        texto: 'Las historias que amamos viven en nosotros para siempre.',
        autor: 'J. K. Rowling'
    },
    {
        texto: 'El libro es fuerza, es valor, es alimento.',
        autor: 'Rubén Darío'
    },
    {
        texto: 'Donde se quiere a los libros también se quiere a los hombres.',
        autor: 'Heinrich Heine'
    },
    {
        texto: 'No existen más que dos reglas para escribir: tener algo que decir y decirlo.',
        autor: 'Oscar Wilde'
    },
    {
        texto: 'Un clásico es un libro que nunca termina de decir lo que tiene que decir.',
        autor: 'Italo Calvino'
    },
    {
        texto: 'La lectura hace al hombre completo; la conversación, ágil; la escritura, preciso.',
        autor: 'Francis Bacon'
    },
    {
        texto: 'Los libros son las abejas que llevan el polen de una inteligencia a otra.',
        autor: 'James Russell Lowell'
    },
    {
        texto: 'Hay libros de los cuales la cubierta y la contracubierta son las mejores partes.',
        autor: 'Charles Dickens'
    },
    {
        texto: 'Una casa sin libros es una casa sin dignidad.',
        autor: 'Edmondo de Amicis'
    }
];

const citasCortas: ReadingQuote[] = [
    { texto: 'Lee para vivir.', autor: 'Gustave Flaubert' },
    { texto: 'No hay amigo tan leal como un libro.', autor: 'Ernest Hemingway' },
    { texto: 'Un cuarto sin libros es como un cuerpo sin alma.', autor: 'Cicerón' },
    { texto: 'Leer es soñar con los ojos abiertos.', autor: 'Anónimo' },
    { texto: 'No todos los que vagan están perdidos.', autor: 'J. R. R. Tolkien' },
    { texto: 'La aventura merece la pena.', autor: 'Esopo' },
    { texto: 'Somos de la misma materia que los sueños.', autor: 'William Shakespeare' },
    { texto: 'La lectura es una forma de felicidad.', autor: 'Jorge Luis Borges' },
    { texto: 'El libro es fuerza, es valor, es alimento.', autor: 'Rubén Darío' },
    { texto: 'Un lector vive mil vidas antes de morir.', autor: 'George R. R. Martin' },
    { texto: 'Los libros son una magia portátil única.', autor: 'Stephen King' },
    { texto: 'La fantasía es una escapatoria necesaria.', autor: 'J. R. R. Tolkien' }
];

export function getRandomReadingQuote(): ReadingQuote {
    const shouldUseShortQuotes = typeof window !== 'undefined' && window.innerWidth <= 700;
    const quotePool = shouldUseShortQuotes ? citasCortas : citasLectura;
    const randomIndex = Math.floor(Math.random() * quotePool.length);

    return quotePool[randomIndex];
}
