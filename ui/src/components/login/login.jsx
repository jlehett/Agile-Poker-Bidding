import React, { useState, useEffect } from 'react'
import loginImg from '../icon/logo.svg'
import { ValidatorForm, TextValidator } from 'react-material-ui-form-validator'

export class Login extends React.Component {
  constructor(props) {
    super(props)
    this.state = {
      isModalOn: false,
      user: {
        username: '',
        email: '',
        password: '',
        confirmPassword: '',
      },
    }
  }

  handleChange = (event) => {
    const email = event.target.value
    this.setState({ email })
  }
  handleSubmit = () => {
    // your submit logic
  }

  render() {
    const { user } = this.state
    return (
      <div className='base-container' ref={this.props.containerRef}>
        <div className='content'>
          <div className='image'>
            <img src={loginImg} />
          </div>
          <div className='form'>
            <ValidatorForm
              ref='form'
              onSubmit={this.handleSubmit}
              onError={(errors) => console.log(errors)}
            >
              <div ClassName='form-group'>
                <TextValidator
                  label='Username'
                  onChange={this.handleChange}
                  name='username'
                  value={user.username}
                  validators={['unknown']}
                  errorMessages={['Username is unknown']}
                  variant='filled'
                  InputProps={{ disableUnderline: true }}
                  fullWidth
                />
                {/* <input type='text' name='username' placeholder='Username' /> */}
              </div>

              <div ClassName='form-group'>
                <TextValidator
                  label='Password'
                  name='password'
                  type='password'
                  validators={['incorrect']}
                  errorMessages={['Password is incorrect']}
                  value={user.password}
                  variant='filled'
                  margin='dense'
                  InputProps={{ disableUnderline: true }}
                  fullWidth
                />
                {/* <input type='text' name='password' placeholder='Password' /> */}
              </div>
            </ValidatorForm>
          </div>
        </div>
        <div className='footer'>
          <div>
            <button type='button' className='btn'>
              Log In
            </button>
          </div>
          <div>
            <button
              onClick={this.props.onForgotPassword}
              type='button'
              className='btn'
            >
              Forgot Password?
            </button>
          </div>
        </div>
      </div>
    )
  }
}
