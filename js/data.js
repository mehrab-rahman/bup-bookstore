/* EDIT YOUR CATALOG HERE. All prices, stock, course mappings and availability are demo data.
   Image paths start at index.html, NOT at this JavaScript file. Use authorized cover images.
   Keep each book id unique and stable: saved carts and orders use it. */
window.BOOKSTORE = {
  settings: { deliveryFee: 60, coupon: 'CAMPUS10', discountRate: 0.10 },
  departments: [
    { id: 'ict', name: 'Information & Communication Technology', short: 'ICT', courses: [
      { id: 'ict-programming', name: 'Structured Programming' },
      { id: 'ict-algorithms', name: 'Data Structures & Algorithms' },
      { id: 'ict-database', name: 'Database Management Systems' },
      { id: 'ict-networking', name: 'Computer Networks' },
      { id: 'ict-software', name: 'Software & Requirement Engineering' }
    ] },
    { id: 'business', name: 'Business Administration', short: 'Business', courses: [
      { id: 'business-marketing', name: 'Principles of Marketing' },
      { id: 'business-economics', name: 'Business Economics' }
    ] },
    { id: 'economics', name: 'Economics', short: 'Economics', courses: [
      { id: 'eco-intro', name: 'Introduction to Economics' },
      { id: 'eco-math', name: 'Mathematics for Economics' }
    ] },
    { id: 'general', name: 'Foundation & General Courses', short: 'Foundation', courses: [
      { id: 'foundation-calculus', name: 'Calculus' },
      { id: 'foundation-programming', name: 'Introduction to Programming' }
    ] }
  ],
  books: [
    { id: 'software-engineering', title: 'Software Engineering', author: 'Ian Sommerville', publisher: 'Pearson', edition: '10th edition', isbn: '9780133943030', category: 'Computing', price: 680, stock: 14, condition: 'New', language: 'English', image: 'assets/images/covers/software-engineering.jpg', color: '#243f69', tag: 'Course essential', courses: ['ict-software'], description: 'A broad introduction to software processes, requirements engineering, system modeling, design, and software quality. A useful companion for understanding how reliable software is built.' },
    { id: 'database-concepts', title: 'Database System Concepts', author: 'Abraham Silberschatz, Henry F. Korth & S. Sudarshan', publisher: 'McGraw Hill', edition: '7th edition', isbn: '9780078022159', category: 'Computing', price: 750, stock: 9, condition: 'New', language: 'English', image: 'assets/images/covers/database-concepts.jpg', color: '#20566b', tag: 'Popular pick', courses: ['ict-database'], description: 'Explore relational databases, SQL, data modeling, transactions, and database system architecture. Connect conceptual design to practical database implementation.' },
    { id: 'computer-networking', title: 'Computer Networking: A Top-Down Approach', author: 'James F. Kurose & Keith W. Ross', publisher: 'Pearson', edition: '8th global edition', isbn: '9781292405469', category: 'Computing', price: 720, stock: 11, condition: 'New', language: 'English', image: 'assets/images/covers/computer-networking.jpg', color: '#66762a', tag: '', courses: ['ict-networking'], description: 'Study networks from the application layer down through transport, routing, and link-layer technologies, with an emphasis on how the Internet works.' },
    { id: 'algorithms', title: 'Introduction to Algorithms', author: 'Thomas H. Cormen, Charles E. Leiserson, Ronald L. Rivest & Clifford Stein', publisher: 'MIT Press', edition: '4th edition', isbn: '9780262046305', category: 'Computing', price: 890, stock: 6, condition: 'New', language: 'English', image: 'assets/images/covers/algorithms.jpg', color: '#293740', tag: 'Reference shelf', courses: ['ict-algorithms'], description: 'A comprehensive reference for algorithms and data structures, covering design techniques, analysis, sorting, graph algorithms, and more.' },
    { id: 'calculus', title: 'Calculus', author: 'James Stewart', publisher: 'Cengage Learning', edition: '8th edition', isbn: '9781285740621', category: 'Mathematics', price: 620, stock: 8, condition: 'New', language: 'English', image: 'assets/images/covers/calculus.jpg', color: '#754e39', tag: '', courses: ['foundation-calculus', 'eco-math'], description: 'Build a strong foundation in limits, differentiation, integration, and their applications through explanations and worked examples.' },
    { id: 'marketing', title: 'Principles of Marketing', author: 'Philip Kotler & Gary Armstrong', publisher: 'Pearson', edition: '17th edition', isbn: '9780134492513', category: 'Business', price: 590, stock: 7, condition: 'New', language: 'English', image: 'assets/images/covers/marketing.jpg', color: '#923d44', tag: '', courses: ['business-marketing'], description: 'An introduction to customer value, marketing strategy, consumer behavior, branding, and the changing world of digital marketing.' },
    { id: 'economics', title: 'Economics', author: 'Paul A. Samuelson & William D. Nordhaus', publisher: 'McGraw Hill', edition: '19th edition', isbn: '9780073511290', category: 'Economics', price: 550, stock: 0, condition: 'New', language: 'English', image: 'assets/images/covers/economics.jpg', color: '#394557', tag: '', courses: ['eco-intro', 'business-economics'], description: 'Explore the principles of microeconomics and macroeconomics, from supply and demand to growth, international trade, and economic policy.' },
    { id: 'c-programming', title: 'The C Programming Language', author: 'Brian W. Kernighan & Dennis M. Ritchie', publisher: 'Prentice Hall', edition: '2nd edition', isbn: '9780131103627', category: 'Computing', price: 280, stock: 3, condition: 'Used · Good', language: 'English', image: 'assets/images/covers/c-programming.jpg', color: '#417ea4', tag: 'Pre-loved', courses: ['ict-programming', 'foundation-programming'], description: 'The classic introduction to C by its creators. This sample pre-loved listing is in good condition, with minor signs of use and all pages intact.' }
  ]
};
