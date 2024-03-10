const blogsRouter = require('express').Router();
const Blog = require('../models/bloglist');
const User = require('../models/user')
const jwt = require('jsonwebtoken')

const getTokenFrom=request=>{
  const authorization = request.get('authorization')

  if(authorization && authorization.startsWith('Bearer')){
    return authorization.replace('Bearer ','')
  }
  return null;
}

blogsRouter.get('/', async (request, response) => {
  const blogs = await Blog.find({}).populate('user', 'username name');
  response.json(blogs);
});

blogsRouter.get('/:id', (request, response, next) => {
  Blog.findById(request.params.id)
    .then((blog) => {
      if (blog) {
        response.json(blog);
      } else {
        response.status(404).end();
      }
    })
    .catch((error) => next(error));
});

blogsRouter.post('/', async (request, response, next) => {
  const { body } = request;


  const decodedToken=jwt.verify(getTokenFrom(request),process.env.SECRET)
  if(!decodedToken.id){
    return response.status(401).json({error:'token invalid'})
  }

  const user = await User.findById(decodedToken.id)

  if (!body.title || !body.url) {
    return response.status(400).json({ error: 'Title and url are required fields.' });
  }

  const blog = new Blog({
    title: body.title,
    author: body.author || '', 
    url: body.url,
    likes: body.likes || 0,
    user: user.id 
  });

  const savedBlog = await blog.save()
  user.blogs = user.blogs.concat(savedBlog.id)
  await user.save()

  response.status(201).json(savedBlog)

  blog
    .save()
    .then((savedBlog) => {
      response.json(savedBlog);
    })
    .catch((error) => next(error));
});

blogsRouter.delete('/:id', (request, response, next) => {
  Blog.findByIdAndRemove(request.params.id)
    .then(() => {
      response.status(204).end();
    })
    .catch((error) => next(error));
});

blogsRouter.put('/:id', async (request, response, next) => {
  try {
    const { body } = request;
    const { id } = request.params;
    const { likes } = body;

    if (likes === undefined) {
      return response.status(400).json({ error: 'Likes field is required for updating.' });
    }

    const updatedBlog = await Blog.findByIdAndUpdate(id, { likes }, { new: true });

    if (!updatedBlog) {
      return response.status(404).json({ error: 'Blog not found' });
    }

    response.json(updatedBlog);
  } catch (error) {
    next(error);
  }
})

module.exports = blogsRouter;
