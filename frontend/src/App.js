import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { ApolloClient, InMemoryCache, ApolloProvider, gql, useQuery, useMutation } from '@apollo/client';
import axios from 'axios';
import {
  AppBar,
  Toolbar,
  Typography,
  Container,
  Button,
  Box,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  IconButton
} from '@mui/material';
import { Delete as DeleteIcon, Edit as EditIcon } from '@mui/icons-material';

// Apollo Client setup
const client = new ApolloClient({
  uri: 'http://localhost:4000/graphql',
  cache: new InMemoryCache()
});

// GraphQL クエリとミューテーション
const GET_ALL = gql`
  query GetAll {
    books {
      id
      title
      regDate
      delFlg
      category {
        id
        name
      }
      author {
        id
        name
        birthday
        address
      }
      details {
        id
        price
        comment
      }
    }
    categories {
      id
      name
    }
    authors {
      id
      name
    }
  }
`;

const CREATE_BOOK = gql`
  mutation CreateBook($title: String!, $categoryId: Int!, $authorId: Int!, $price: Float!, $comment: String) {
    createBook(title: $title, categoryId: $categoryId, authorId: $authorId, price: $price, comment: $comment) {
      id
      title
      regDate
      delFlg
      category {
        id
        name
      }
      author {
        id
        name
        birthday
        address
      }
      details {
        id
        price
        comment
      }
    }
  }
`;

const UPDATE_BOOK = gql`
  mutation UpdateBook($id: ID!, $title: String, $categoryId: Int, $authorId: Int, $price: Float, $comment: String) {
    updateBook(id: $id, title: $title, categoryId: $categoryId, authorId: $authorId, price: $price, comment: $comment) {
      id
      title
      regDate
      delFlg
      category {
        id
        name
      }
      author {
        id
        name
        birthday
        address
      }
      details {
        id
        price
        comment
      }
    }
  }
`;

const DELETE_BOOK = gql`
  mutation DeleteBook($id: ID!) {
    deleteBook(id: $id)
  }
`;

// 比較用: GraphQLでbooksだけを取ってくるクエリ
const GET_BOOKS_ONLY = gql`
  query GetBooksOnly {
    books {
      id
      title
      regDate
      delFlg
      category {
        id
        name
      }
      author {
        id
        name
      }
      details {
        id
        price
        comment
      }
    }
  }
`;

// 比較用: GraphQLでbooksとcategoriesだけを取ってくるクエリ
const GET_BOOKS_AND_CATEGORIES = gql`
  query GetBooksAndCategories {
    books {
      id
      title
      regDate
      delFlg
      category {
        id
        name
      }
      author {
        id
        name
      }
      details {
        id
        price
        comment
      }
    }
    categories {
      id
      name
    }
  }
`;

// GraphQL Book List Component
function GraphQLBookList() {
  const { loading, error, data, refetch } = useQuery(GET_ALL);
  const [createBook] = useMutation(CREATE_BOOK);
  const [updateBook] = useMutation(UPDATE_BOOK);
  const [deleteBook] = useMutation(DELETE_BOOK);
  const [open, setOpen] = React.useState(false);
  const [editingBook, setEditingBook] = React.useState(null);
  const [formData, setFormData] = React.useState({
    title: '',
    categoryId: '',
    authorId: '',
    price: '',
    comment: ''
  });

  if (loading) return <Typography>Loading...</Typography>;
  if (error) return <Typography>Error: {error.message}</Typography>;

  const handleOpen = (book = null) => {
    if (book) {
      setEditingBook(book);
      setFormData({
        title: book.title,
        categoryId: book.category?.id || '',
        authorId: book.author?.id || '',
        price: book.details?.price || '',
        comment: book.details?.comment || ''
      });
    } else {
      setEditingBook(null);
      setFormData({
        title: '',
        categoryId: '',
        authorId: '',
        price: '',
        comment: ''
      });
    }
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
    setEditingBook(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingBook) {
        await updateBook({
          variables: {
            id: editingBook.id,
            ...formData
          }
        });
      } else {
        await createBook({
          variables: formData
        });
      }
      handleClose();
      refetch();
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this book?')) {
      try {
        await deleteBook({
          variables: { id }
        });
        refetch();
      } catch (error) {
        console.error('Error:', error);
      }
    }
  };

  return (
    <Box>
      <Box sx={{ mb: 2 }}>
        <Button variant="contained" color="primary" onClick={() => handleOpen()}>
          Add New Book
        </Button>
      </Box>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Title</TableCell>
              <TableCell>Category</TableCell>
              <TableCell>Author</TableCell>
              <TableCell>Price</TableCell>
              <TableCell>Comment</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {data.books.map((book) => (
              <TableRow key={book.id}>
                <TableCell>{book.title}</TableCell>
                <TableCell>{book.category?.name || 'N/A'}</TableCell>
                <TableCell>{book.author?.name || 'N/A'}</TableCell>
                <TableCell>¥{book.details?.price || 'N/A'}</TableCell>
                <TableCell>{book.details?.comment || 'N/A'}</TableCell>
                <TableCell>
                  <IconButton onClick={() => handleOpen(book)}>
                    <EditIcon />
                  </IconButton>
                  <IconButton onClick={() => handleDelete(book.id)}>
                    <DeleteIcon />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={open} onClose={handleClose}>
        <DialogTitle>{editingBook ? 'Edit Book' : 'Add New Book'}</DialogTitle>
        <DialogContent>
          <Box component="form" onSubmit={handleSubmit} sx={{ mt: 2 }}>
            <TextField
              fullWidth
              label="Title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              margin="normal"
              required
            />
            <TextField
              select
              fullWidth
              label="Category"
              value={formData.categoryId}
              onChange={(e) => setFormData({ ...formData, categoryId: parseInt(e.target.value) })}
              margin="normal"
              required
            >
              {data.categories.map((cat) => (
                <MenuItem key={cat.id} value={cat.id}>{cat.name}</MenuItem>
              ))}
            </TextField>
            <TextField
              select
              fullWidth
              label="Author"
              value={formData.authorId}
              onChange={(e) => setFormData({ ...formData, authorId: parseInt(e.target.value) })}
              margin="normal"
              required
            >
              {data.authors.map((author) => (
                <MenuItem key={author.id} value={author.id}>{author.name}</MenuItem>
              ))}
            </TextField>
            <TextField
              fullWidth
              label="Price"
              type="number"
              value={formData.price}
              onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) })}
              margin="normal"
              required
            />
            <TextField
              fullWidth
              label="Comment"
              value={formData.comment}
              onChange={(e) => setFormData({ ...formData, comment: e.target.value })}
              margin="normal"
              multiline
              rows={4}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>Cancel</Button>
          <Button onClick={handleSubmit} variant="contained" color="primary">
            {editingBook ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

// REST API Book List Component
function RESTBookList() {
  const [books, setBooks] = React.useState([]);
  const [categories, setCategories] = React.useState([]);
  const [authors, setAuthors] = React.useState([]);
  const [open, setOpen] = React.useState(false);
  const [editingBook, setEditingBook] = React.useState(null);
  const [formData, setFormData] = React.useState({
    title: '',
    categoryId: '',
    authorId: '',
    price: '',
    comment: ''
  });

  const fetchBooks = async () => {
    try {
      const response = await axios.get('http://localhost:4000/api/books');
      setBooks(response.data);
    } catch (error) {
      console.error('Error fetching books:', error);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await axios.get('http://localhost:4000/api/categories');
      setCategories(response.data);
    } catch (error) {
      setCategories([]);
    }
  };

  const fetchAuthors = async () => {
    try {
      const response = await axios.get('http://localhost:4000/api/authors');
      setAuthors(response.data);
    } catch (error) {
      setAuthors([]);
    }
  };

  React.useEffect(() => {
    fetchBooks();
    fetchCategories();
    fetchAuthors();
  }, []);

  const handleOpen = (book = null) => {
    if (book) {
      setEditingBook(book);
      setFormData({
        title: book.title,
        categoryId: book.category_id,
        authorId: book.author_id,
        price: book.price,
        comment: book.comment || ''
      });
    } else {
      setEditingBook(null);
      setFormData({
        title: '',
        categoryId: '',
        authorId: '',
        price: '',
        comment: ''
      });
    }
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
    setEditingBook(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingBook) {
        await axios.put(`http://localhost:4000/api/books/${editingBook.id}`, formData);
      } else {
        await axios.post('http://localhost:4000/api/books', formData);
      }
      handleClose();
      fetchBooks();
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this book?')) {
      try {
        await axios.delete(`http://localhost:4000/api/books/${id}`);
        fetchBooks();
      } catch (error) {
        console.error('Error:', error);
      }
    }
  };

  return (
    <Box>
      <Box sx={{ mb: 2 }}>
        <Button variant="contained" color="primary" onClick={() => handleOpen()}>
          Add New Book
        </Button>
      </Box>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Title</TableCell>
              <TableCell>Category</TableCell>
              <TableCell>Author</TableCell>
              <TableCell>Price</TableCell>
              <TableCell>Comment</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {books.map((book) => (
              <TableRow key={book.id}>
                <TableCell>{book.title}</TableCell>
                <TableCell>{book.category_name}</TableCell>
                <TableCell>{book.author_name}</TableCell>
                <TableCell>¥{book.price}</TableCell>
                <TableCell>{book.comment}</TableCell>
                <TableCell>
                  <IconButton onClick={() => handleOpen(book)}>
                    <EditIcon />
                  </IconButton>
                  <IconButton onClick={() => handleDelete(book.id)}>
                    <DeleteIcon />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={open} onClose={handleClose}>
        <DialogTitle>{editingBook ? 'Edit Book' : 'Add New Book'}</DialogTitle>
        <DialogContent>
          <Box component="form" onSubmit={handleSubmit} sx={{ mt: 2 }}>
            <TextField
              fullWidth
              label="Title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              margin="normal"
              required
            />
            <TextField
              select
              fullWidth
              label="Category"
              value={formData.categoryId}
              onChange={(e) => setFormData({ ...formData, categoryId: parseInt(e.target.value) })}
              margin="normal"
              required
            >
              {categories.map((cat) => (
                <MenuItem key={cat.id} value={cat.id}>{cat.name}</MenuItem>
              ))}
            </TextField>
            <TextField
              select
              fullWidth
              label="Author"
              value={formData.authorId}
              onChange={(e) => setFormData({ ...formData, authorId: parseInt(e.target.value) })}
              margin="normal"
              required
            >
              {authors.map((author) => (
                <MenuItem key={author.id} value={author.id}>{author.name}</MenuItem>
              ))}
            </TextField>
            <TextField
              fullWidth
              label="Price"
              type="number"
              value={formData.price}
              onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) })}
              margin="normal"
              required
            />
            <TextField
              fullWidth
              label="Comment"
              value={formData.comment}
              onChange={(e) => setFormData({ ...formData, comment: e.target.value })}
              margin="normal"
              multiline
              rows={4}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>Cancel</Button>
          <Button onClick={handleSubmit} variant="contained" color="primary">
            {editingBook ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

// Main App Component
function App() {
  return (
    <ApolloProvider client={client}>
      <Router>
        <Box sx={{ flexGrow: 1 }}>
          <AppBar position="static">
            <Toolbar>
              <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
                Bookstore
              </Typography>
              <Button color="inherit" component={Link} to="/graphql">
                GraphQL
              </Button>
              <Button color="inherit" component={Link} to="/rest">
                REST API
              </Button>
            </Toolbar>
          </AppBar>

          <Container sx={{ mt: 4 }}>
            <Routes>
              <Route path="/graphql" element={<GraphQLBookList />} />
              <Route path="/rest" element={<RESTBookList />} />
              <Route path="/" element={<GraphQLBookList />} />
            </Routes>
          </Container>
        </Box>
      </Router>
    </ApolloProvider>
  );
}

export default App; 