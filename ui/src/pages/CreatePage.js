import React, { useEffect, useState } from 'react'
import { connect } from 'react-redux'
import { useHistory } from 'react-router-dom'
import {
  Button,
  Checkbox,
  FormControlLabel,
  Grid,
  Typography,
} from '@material-ui/core'
import CoffeeCard from '../components/create/CoffeeCard'
import EditCard from '../components/create/EditCard'
import AddCard from '../components/create/AddCard'
import CardGrid from '../components/CardGrid'
import { roomServiceSocketSelector } from '../data/state/room-service/room-service.selectors'
import {
  createRoomServiceConnection,
  emitEvent,
} from '../data/state/room-service/room-service.actions'
import { loginUser } from '../data/state/account/account.actions'
import {
  startGame,
  saveGame,
} from '../data/state/room-config/room-config.actions'
import { setAccount } from '../data/state/account/account.actions'
import { accountSelector } from '../data/state/account/account.selector'
import axios from 'axios'
import './Styling.css'
import Paper from '@material-ui/core/Paper'
import { makeStyles } from '@material-ui/core/styles'
import ResponsiveContainer from '../components/ResponsiveContainer'
import AppBar from '@material-ui/core/AppBar'
import Toolbar from '@material-ui/core/Toolbar'
import { Link } from 'react-router-dom'
import useScrollTrigger from '@material-ui/core/useScrollTrigger'
import Box from '@material-ui/core/Box'
import Slide from '@material-ui/core/Slide'
import PropTypes from 'prop-types'
import userImg from '../components/icon/logowhite.svg'
import PlayArrowIcon from '@material-ui/icons/PlayArrow'
function ElevationScroll(props) {
  const { children, window } = props
  // Note that you normally won't need to set the window ref as useScrollTrigger
  // will default to window.
  // This is only being set here because the demo is in an iframe.
  const trigger = useScrollTrigger({
    disableHysteresis: true,
    threshold: 0,
    target: window ? window() : undefined,
  })

  return React.cloneElement(children, {
    elevation: trigger ? 4 : 0,
  })
}

ElevationScroll.propTypes = {
  children: PropTypes.element.isRequired,
  /**
   * Injected by the documentation to work in an iframe.
   * You won't need it on your project.
   */
  window: PropTypes.func,
}

const CreatePage = ({
  account,
  loginUser,
  emitEvent,
  startGame,
  saveGame,
  onSubmit,
  roomServiceSocket,
  createRoomServiceConnection,
}) => {
  const [loading, setLoading] = useState(false)
  const [cards, setCards] = useState([])
  const [allowAbstain, setAllowAbstain] = useState(false)
  const [roomExistsError, setRoomExistsError] = useState(false)
  const history = useHistory()

  useEffect(() => {
    ;(async () => {
      // await firebase
      //   .auth()
      //   .signInWithEmailAndPassword('ryglaspey@knights.ucf.edu', 'password');
      // await firebase.auth().signOut();

      loginUser(async (account) => {
        console.log(account)
        if (account) {
          setCards(account.roomConfig.deck)
          setAllowAbstain(account.roomConfig.allowAbstain)
          const socket = await createRoomServiceConnection()
          socket.on('connect', () => {
            console.log('Connected!')
          })
          socket.on('disconnect', () => {
            console.log('Disconnected')
          })
          socket.on('room_already_created', (event) => {
            console.log(event)
          })
          socket.on('create_success', (event) => {
            console.log('create_success')
            history.push(`/room/${account.username}`)
          })
        } else {
          history.push('/login')
        }
      }, setAccount)
    })()
  }, [])

  const genChangeCard = (idx) => {
    return (card) => {
      const cardsCopy = [...cards]
      cardsCopy[idx] = card
      setCards(cardsCopy)
    }
  }

  const genOnDelete = (idx) => {
    return () => {
      const cardsCopy = [...cards.slice(0, idx), ...cards.slice(idx + 1)]
      setCards(cardsCopy)
    }
  }

  const onSave = async () => {
    setLoading(true)

    const roomConfig = {
      deck: cards,
      allowAbstain,
    }

    await saveGame(roomConfig)

    setLoading(false)
  }

  const onStart = async () => {
    try {
      setLoading(true)

      const roomConfig = {
        deck: cards,
        allowAbstain,
      }

      await startGame(account.username, roomConfig, emitEvent)

      history.push(`/room/${account.username}`)
    } catch (err) {
      console.error(err)
    }
  }

  const elements = []
  elements.push(...cards.map((it, idx) => (
    <EditCard
    key={idx}
    card={it}
    setCard={genChangeCard(idx)}
    deleteCard={genOnDelete(idx)}
    setAllowAbstain={(flag) => setAllowAbstain(flag)}
    />
    )))
  elements.push(
    <AddCard
    key='add'
    onClick={() => setCards(cards.concat({ value: 1, tag: 'ez' }))}
    />
    )
      if (allowAbstain) {
        elements.push(
          <CoffeeCard/>
        )
      }
  const classes = useStyles()

  return (
    <ResponsiveContainer>
      <ElevationScroll fullWidth>
        <AppBar
          position='fixed'
          style={{
            zIndex: '1500',
          }}
        >
          <Toolbar
            style={{
              display: 'flex',
              justifyContent: 'space-between',
            }}
            noWrap
          >
            <Button
              component={Link}
              to={'/'}
              // fontSize='small'

              style={{
                //   paddingTop: '16px',
                //   paddingBottom: '8px',
                color: '#fff',
                //   font: "'Reem Kufi', sans-serif",
              }}
            >
              <img src={userImg} style={{ height: '30px' }} />
              <Typography
                variant='h6'
                style={{
                  paddingTop: '16px',
                  paddingBottom: '8px',
                  textIndent: '0.5em',
                  textTransform: 'none',
                }}
              >
                PilePlan
              </Typography>
            </Button>

            <div>
              <Typography variant='h6'>CONFIGURE DECK</Typography>
            </div>
            <Button
              disabled={loading}
              variant='outlined'
              color='secondary'
              style={{
                margin: '5px',
                paddingTop: '5px',
                paddingBottom: '5px',
                paddingLeft: '12px',
                paddingRight: '12px',
              }}
              size='large'
              onClick={onStart}
              disableElevation
              startIcon={<PlayArrowIcon />}
            >
              Start
            </Button>
          </Toolbar>
        </AppBar>
      </ElevationScroll>
      <Toolbar />
      <div className={classes.center}>
          <div>
            <CardGrid className={classes.marginBottom}>{elements}</CardGrid>
            <Grid item component='form' className={classes.root}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={allowAbstain}
                    onChange={(event) => setAllowAbstain(event.target.checked)}
                    color='primary'
                    style={{
                      color: '#2b84ed',
                      marginLeft: 5,
                    }}
                  >
                    <Button
                      variant='contained'
                      color='primary'
                      style={{
                        margin: '5px',
                      }}
                      disabled={loading}
                      onClick={onSave}
                    >
                      Allow Abstain
                    </Button>
                  </Checkbox>
                }
                label='Allow Abstain'
                style={{
                  color: '#2b84ed',
                  marginLeft: 5,
                }}
              />
              <Button
                variant='contained'
                color='primary'
                style={{
                  margin: '5px',
                }}
                disabled={loading}
                onClick={onSave}
              >
                Save
              </Button>
            </Grid>
          </div>
      </div>
    </ResponsiveContainer>
  )
}
const useStyles = makeStyles((theme) => ({
  root: {
    // marginTop: 12,
    padding: '6px 10px',
    // display: 'flex',
    alignItems: 'center',
    // width: 320,
    background: '#fff',
  },
  title: {
    paddingBottom: 24,
  },
  center: {
    display: 'flex',
    justifyContent: 'center',
  },
  marginBottom: {
    marginBottom: 12,
  }
}))

const mapStateToProps = (state) => {
  return {
    account: accountSelector(state),
    roomServiceSocket: roomServiceSocketSelector(state),
  }
}

const mapDispatchToProps = {
  createRoomServiceConnection,
  emitEvent,
  startGame,
  saveGame,
  loginUser,
}

export default connect(mapStateToProps, mapDispatchToProps)(CreatePage)
