import React from 'react'
import loginImg from '../icon/logo.svg'

import { ValidatorForm, TextValidator } from 'react-material-ui-form-validator'

export class Register extends React.Component {
  constructor(props) {
    super(props)
    this.state = {
      user: {
        username: '',
        email: '',
        password: '',
        confirmPassword: '',
      },
    }
  }

  handleChange = (event) => {
    const { user } = this.state
    user[event.target.name] = event.target.value
    this.setState({ user })
  }

  handleSubmit = () => {
    // your submit logic
  }

  componentDidMount() {
    // custom rule will have name 'isPasswordMatch'
    ValidatorForm.addValidationRule('isPasswordMatch', (value) => {
      if (value !== this.state.user.password) {
        return false
      }
      return true
    })
  }

  componentWillUnmount() {
    // remove rule when it is not needed
    ValidatorForm.removeValidationRule('isPasswordMatch')
  }

  render() {
    // const { username } = this.state
    // const { email } = this.state
    const { user } = this.state

    return (
      <div className='base-container' ref={this.props.containerRef}>
        {/* <div className="header">REGISTER</div> */}
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
                  validators={[
                    'required',
                    'minStringLength: 5',
                    'maxStringLength: 12',
                  ]}
                  errorMessages={[
                    'Username is required',
                    'Username must be at least 5 characters long',
                    'Username can have maximum 12 characters',
                  ]}
                  variant='filled'
                  InputProps={{ disableUnderline: true }}
                  fullWidth
                />
                {/* <input type='text' name='username' placeholder='Username' /> */}
              </div>
              <div ClassName='form-group'>
                <TextValidator
                  label='E-mail'
                  onChange={this.handleChange}
                  name='email'
                  value={user.email}
                  validators={['required', 'isEmail']}
                  errorMessages={['Required Field', 'Email is invalid']}
                  variant='filled'
                  margin='dense'
                  InputProps={{ disableUnderline: true }}
                  fullWidth
                />
                {/* <input type='text' name='email' placeholder='E-mail' /> */}
              </div>
              <div ClassName='form-group'>
                <TextValidator
                  label='Password'
                  onChange={this.handleChange}
                  name='password'
                  type='password'
                  validators={['required', 'minStringLength: 7']}
                  errorMessages={[
                    'Password is required',
                    'Password must be at least 7 characters long',
                  ]}
                  value={user.password}
                  variant='filled'
                  margin='dense'
                  InputProps={{ disableUnderline: true }}
                  fullWidth
                />
                {/* <input type='text' name='password' placeholder='Password' /> */}
              </div>
              <div ClassName='form-group'>
                <TextValidator
                  label='Comfirm Password'
                  onChange={this.handleChange}
                  name='confirmPassword'
                  type='password'
                  validators={['isPasswordMatch', 'required']}
                  errorMessages={['Passwords Mismatch', 'Required Field']}
                  value={user.confirmPassword}
                  variant='filled'
                  margin='dense'
                  InputProps={{ disableUnderline: true }}
                  fullWidth
                />
                {/* <input
                  type='text'
                  name='confirmPassword'
                  placeholder='Confirm Password'
                /> */}
              </div>
            </ValidatorForm>
          </div>
        </div>
        <div className='footer'>
          <button type='button' className='btn'>
            Sign Up
          </button>
        </div>
      </div>
    )
  }
}
