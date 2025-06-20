const express = require('express');
const { ApolloServer } = require('apollo-server-express');
const { gql } = require('apollo-server-express');
const mysql = require('mysql2/promise');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// データベース接続
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'db',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'password',
  database: process.env.DB_NAME || 'bookstore',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// GraphQL スキーマ
const typeDefs = gql`
  type Author {
    id: ID!
    name: String!
    birthday: String
    address: String
  }

  type Category {
    id: ID!
    name: String!
  }

  type BookDetail {
    id: ID!
    price: Float!
    comment: String
  }

  type Book {
    id: ID!
    title: String!
    category: Category
    author: Author
    regDate: String
    delFlg: Boolean
    details: BookDetail
  }

  type Query {
    books: [Book]
    book(id: ID!): Book
    authors: [Author]
    categories: [Category]
  }

  type Mutation {
    createBook(
      title: String!
      categoryId: Int!
      authorId: Int!
      price: Float!
      comment: String
    ): Book
    updateBook(
      id: ID!
      title: String
      categoryId: Int
      authorId: Int
      price: Float
      comment: String
    ): Book
    deleteBook(id: ID!): Boolean
  }
`;

// GraphQL リゾルバ
const resolvers = {
  Query: {
    books: async () => {
      const [rows] = await pool.query(`
        SELECT 
          b.*,
          c.id as category_id,
          c.name as category_name,
          a.id as author_id,
          a.name as author_name,
          a.birthday,
          a.address,
          bd.id as detail_id,
          bd.price,
          bd.comment
        FROM Books b
        LEFT JOIN Categories c ON b.category_id = c.id
        LEFT JOIN Authors a ON b.author_id = a.id
        LEFT JOIN BookDetails bd ON b.id = bd.book_id
        WHERE b.del_flg = false
      `);
      
      return rows.map(row => ({
        id: row.id,
        title: row.title,
        regDate: row.reg_date,
        delFlg: row.del_flg,
        category: row.category_id ? {
          id: row.category_id,
          name: row.category_name
        } : null,
        author: row.author_id ? {
          id: row.author_id,
          name: row.author_name,
          birthday: row.birthday,
          address: row.address
        } : null,
        details: row.detail_id ? {
          id: row.detail_id,
          price: row.price,
          comment: row.comment
        } : null
      }));
    },
    book: async (_, { id }) => {
      const [rows] = await pool.query(`
        SELECT 
          b.*,
          c.id as category_id,
          c.name as category_name,
          a.id as author_id,
          a.name as author_name,
          a.birthday,
          a.address,
          bd.id as detail_id,
          bd.price,
          bd.comment
        FROM Books b
        LEFT JOIN Categories c ON b.category_id = c.id
        LEFT JOIN Authors a ON b.author_id = a.id
        LEFT JOIN BookDetails bd ON b.id = bd.book_id
        WHERE b.id = ? AND b.del_flg = false
      `, [id]);
      
      if (rows.length === 0) return null;
      
      const row = rows[0];
      return {
        id: row.id,
        title: row.title,
        regDate: row.reg_date,
        delFlg: row.del_flg,
        category: row.category_id ? {
          id: row.category_id,
          name: row.category_name
        } : null,
        author: row.author_id ? {
          id: row.author_id,
          name: row.author_name,
          birthday: row.birthday,
          address: row.address
        } : null,
        details: row.detail_id ? {
          id: row.detail_id,
          price: row.price,
          comment: row.comment
        } : null
      };
    },
    authors: async () => {
      const [rows] = await pool.query('SELECT * FROM Authors');
      return rows;
    },
    categories: async () => {
      const [rows] = await pool.query('SELECT * FROM Categories');
      return rows;
    }
  },
  Mutation: {
    createBook: async (_, { title, categoryId, authorId, price, comment }) => {
      const connection = await pool.getConnection();
      try {
        await connection.beginTransaction();
        
        const [bookResult] = await connection.query(
          'INSERT INTO Books (title, category_id, author_id) VALUES (?, ?, ?)',
          [title, categoryId, authorId]
        );
        
        const bookId = bookResult.insertId;
        
        await connection.query(
          'INSERT INTO BookDetails (book_id, price, comment) VALUES (?, ?, ?)',
          [bookId, price, comment]
        );
        
        await connection.commit();
        
        const [rows] = await connection.query(`
          SELECT 
            b.*,
            c.id as category_id,
            c.name as category_name,
            a.id as author_id,
            a.name as author_name,
            a.birthday,
            a.address,
            bd.id as detail_id,
            bd.price,
            bd.comment
          FROM Books b
          LEFT JOIN Categories c ON b.category_id = c.id
          LEFT JOIN Authors a ON b.author_id = a.id
          LEFT JOIN BookDetails bd ON b.id = bd.book_id
          WHERE b.id = ?
        `, [bookId]);
        
        const row = rows[0];
        return {
          id: row.id,
          title: row.title,
          regDate: row.reg_date,
          delFlg: row.del_flg,
          category: row.category_id ? {
            id: row.category_id,
            name: row.category_name
          } : null,
          author: row.author_id ? {
            id: row.author_id,
            name: row.author_name,
            birthday: row.birthday,
            address: row.address
          } : null,
          details: row.detail_id ? {
            id: row.detail_id,
            price: row.price,
            comment: row.comment
          } : null
        };
      } catch (error) {
        await connection.rollback();
        throw error;
      } finally {
        connection.release();
      }
    },
    updateBook: async (_, { id, ...updates }) => {
      const connection = await pool.getConnection();
      try {
        await connection.beginTransaction();
        
        if (updates.title || updates.categoryId || updates.authorId) {
          const updateFields = [];
          const values = [];
          
          if (updates.title) {
            updateFields.push('title = ?');
            values.push(updates.title);
          }
          if (updates.categoryId) {
            updateFields.push('category_id = ?');
            values.push(updates.categoryId);
          }
          if (updates.authorId) {
            updateFields.push('author_id = ?');
            values.push(updates.authorId);
          }
          
          values.push(id);
          
          await connection.query(
            `UPDATE Books SET ${updateFields.join(', ')} WHERE id = ?`,
            values
          );
        }
        
        if (updates.price || updates.comment) {
          const updateFields = [];
          const values = [];
          
          if (updates.price) {
            updateFields.push('price = ?');
            values.push(updates.price);
          }
          if (updates.comment) {
            updateFields.push('comment = ?');
            values.push(updates.comment);
          }
          
          values.push(id);
          
          await connection.query(
            `UPDATE BookDetails SET ${updateFields.join(', ')} WHERE book_id = ?`,
            values
          );
        }
        
        await connection.commit();
        
        const [rows] = await connection.query(`
          SELECT 
            b.*,
            c.id as category_id,
            c.name as category_name,
            a.id as author_id,
            a.name as author_name,
            a.birthday,
            a.address,
            bd.id as detail_id,
            bd.price,
            bd.comment
          FROM Books b
          LEFT JOIN Categories c ON b.category_id = c.id
          LEFT JOIN Authors a ON b.author_id = a.id
          LEFT JOIN BookDetails bd ON b.id = bd.book_id
          WHERE b.id = ?
        `, [id]);
        
        if (rows.length === 0) return null;
        
        const row = rows[0];
        return {
          id: row.id,
          title: row.title,
          regDate: row.reg_date,
          delFlg: row.del_flg,
          category: row.category_id ? {
            id: row.category_id,
            name: row.category_name
          } : null,
          author: row.author_id ? {
            id: row.author_id,
            name: row.author_name,
            birthday: row.birthday,
            address: row.address
          } : null,
          details: row.detail_id ? {
            id: row.detail_id,
            price: row.price,
            comment: row.comment
          } : null
        };
      } catch (error) {
        await connection.rollback();
        throw error;
      } finally {
        connection.release();
      }
    },
    deleteBook: async (_, { id }) => {
      const [result] = await pool.query(
        'UPDATE Books SET del_flg = true WHERE id = ?',
        [id]
      );
      return result.affectedRows > 0;
    }
  }
};

// REST API ルート
app.get('/api/books', async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT b.*, c.name as category_name, a.name as author_name,
             a.birthday, a.address, bd.price, bd.comment
      FROM Books b
      LEFT JOIN Categories c ON b.category_id = c.id
      LEFT JOIN Authors a ON b.author_id = a.id
      LEFT JOIN BookDetails bd ON b.id = bd.book_id
      WHERE b.del_flg = false
    `);
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/books/:id', async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT b.*, c.name as category_name, a.name as author_name,
             a.birthday, a.address, bd.price, bd.comment
      FROM Books b
      LEFT JOIN Categories c ON b.category_id = c.id
      LEFT JOIN Authors a ON b.author_id = a.id
      LEFT JOIN BookDetails bd ON b.id = bd.book_id
      WHERE b.id = ? AND b.del_flg = false
    `, [req.params.id]);
    
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Book not found' });
    }
    
    res.json(rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/books', async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const { title, categoryId, authorId, price, comment } = req.body;
    
    await connection.beginTransaction();
    
    const [bookResult] = await connection.query(
      'INSERT INTO Books (title, category_id, author_id) VALUES (?, ?, ?)',
      [title, categoryId, authorId]
    );
    
    const bookId = bookResult.insertId;
    
    await connection.query(
      'INSERT INTO BookDetails (book_id, price, comment) VALUES (?, ?, ?)',
      [bookId, price, comment]
    );
    
    await connection.commit();
    
    const [book] = await connection.query(`
      SELECT b.*, c.name as category_name, a.name as author_name,
             a.birthday, a.address, bd.price, bd.comment
      FROM Books b
      LEFT JOIN Categories c ON b.category_id = c.id
      LEFT JOIN Authors a ON b.author_id = a.id
      LEFT JOIN BookDetails bd ON b.id = bd.book_id
      WHERE b.id = ?
    `, [bookId]);
    
    res.status(201).json(book[0]);
  } catch (error) {
    await connection.rollback();
    res.status(500).json({ error: error.message });
  } finally {
    connection.release();
  }
});

app.put('/api/books/:id', async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const { title, categoryId, authorId, price, comment } = req.body;
    const bookId = req.params.id;
    
    await connection.beginTransaction();
    
    if (title || categoryId || authorId) {
      const updateFields = [];
      const values = [];
      
      if (title) {
        updateFields.push('title = ?');
        values.push(title);
      }
      if (categoryId) {
        updateFields.push('category_id = ?');
        values.push(categoryId);
      }
      if (authorId) {
        updateFields.push('author_id = ?');
        values.push(authorId);
      }
      
      values.push(bookId);
      
      await connection.query(
        `UPDATE Books SET ${updateFields.join(', ')} WHERE id = ?`,
        values
      );
    }
    
    if (price || comment) {
      const updateFields = [];
      const values = [];
      
      if (price) {
        updateFields.push('price = ?');
        values.push(price);
      }
      if (comment) {
        updateFields.push('comment = ?');
        values.push(comment);
      }
      
      values.push(bookId);
      
      await connection.query(
        `UPDATE BookDetails SET ${updateFields.join(', ')} WHERE book_id = ?`,
        values
      );
    }
    
    await connection.commit();
    
    const [book] = await connection.query(`
      SELECT b.*, c.name as category_name, a.name as author_name,
             a.birthday, a.address, bd.price, bd.comment
      FROM Books b
      LEFT JOIN Categories c ON b.category_id = c.id
      LEFT JOIN Authors a ON b.author_id = a.id
      LEFT JOIN BookDetails bd ON b.id = bd.book_id
      WHERE b.id = ?
    `, [bookId]);
    
    if (book.length === 0) {
      return res.status(404).json({ error: 'Book not found' });
    }
    
    res.json(book[0]);
  } catch (error) {
    await connection.rollback();
    res.status(500).json({ error: error.message });
  } finally {
    connection.release();
  }
});

app.delete('/api/books/:id', async (req, res) => {
  try {
    const [result] = await pool.query(
      'UPDATE Books SET del_flg = true WHERE id = ?',
      [req.params.id]
    );
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Book not found' });
    }
    
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// REST API: カテゴリ一覧
app.get('/api/categories', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT id, name FROM Categories');
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// REST API: 著者一覧
app.get('/api/authors', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT id, name FROM Authors');
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Apollo Server 作成
const server = new ApolloServer({
  typeDefs,
  resolvers,
  context: { pool }
});

// サーバー起動
async function startServer() {
  await server.start();
  server.applyMiddleware({ app });
  
  const PORT = process.env.PORT || 4000;
  app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
    console.log(`GraphQL playground available at http://localhost:${PORT}${server.graphqlPath}`);
  });
}

startServer(); 