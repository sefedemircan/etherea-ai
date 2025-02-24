import { MantineProvider, createTheme } from '@mantine/core';
import { Notifications } from '@mantine/notifications';
import { BrowserRouter as Router } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import AppRoutes from './pages/AppRoutes';
import '@mantine/core/styles.css';
import '@mantine/dates/styles.css';
import '@mantine/notifications/styles.css';
import './styles.css';

const theme = createTheme({
  colors: {
    etherea: [
      '#F9F6FF', // 0: Saf Berraklık (Arka Plan)
      '#F0EBFF',
      '#E2D8FF',
      '#C5B3FF',
      '#9A7BFF', // 4: Ana Renk (Göksel Huzur)
      '#7D5EFF',
      '#5E4B8B', // 6: Derinlik Renk (Mistik Gizem)
      '#4A3B6E',
      '#362B51',
      '#231C34',
    ],
    serenity: [
      '#F5FBFE',
      '#E8F6FC',
      '#D2EEF9',
      '#B5E6F6', // 3: İkincil Renk (Sonsuz Sakinlik)
      '#8ED5F0',
      '#67C4EA',
      '#40B3E4',
      '#2696D1',
      '#1B75A3',
      '#105475',
    ],
    warmth: [
      '#FFF9F5',
      '#FFF2E8',
      '#FFE5D4',
      '#FFD8BE', // 3: Aksan Renk (İçsel Işık)
      '#FFC299',
      '#FFAC75',
      '#FF9652',
      '#FF802E',
      '#FF6A0A',
      '#E65600',
    ],
  },
  primaryColor: 'etherea',
  primaryShade: 4,
  fontFamily: 'Poppins, sans-serif',
  headings: {
    fontFamily: 'Poppins, sans-serif',
    fontWeight: 600,
  },
  defaultRadius: 'md',
  white: '#F9F6FF',
  black: '#5E4B8B',
  components: {
    Paper: {
      defaultProps: {
        bg: '#F9F6FF',
      },
      styles: {
        root: {
          border: '1px solid #E2D8FF',
        },
      },
    },
    Button: {
      defaultProps: {
        color: 'warmth.3',
      },
      styles: {
        root: {
          color: '#9A7BFF',
          fontWeight: 500,
          '&:hover': {
            backgroundColor: '#FFD8BE',
          },
        },
      },
    },
    ActionIcon: {
      defaultProps: {
        color: 'etherea.4',
      },
      styles: {
        root: {
          '&:hover': {
            backgroundColor: '#E2D8FF',
          },
        },
      },
    },
    Title: {
      styles: {
        root: {
          color: '#5E4B8B',
          fontWeight: 600,
        },
      },
    },
    Text: {
      styles: {
        root: {
          fontWeight: 400,
        },
      },
    },
    Textarea: {
      defaultProps: {
        bg: '#F9F6FF',
      },
      styles: {
        input: {
          backgroundColor: '#F9F6FF',
          color: '#5E4B8B',
          border: '1px solid #E2D8FF',
          fontFamily: 'Poppins, sans-serif',
          '&:focus': {
            borderColor: '#9A7BFF',
          },
          '&::placeholder': {
            color: '#9A7BFF',
          },
        },
      },
    },
    Input: {
      defaultProps: {
        bg: '#F9F6FF',
      },
      styles: {
        input: {
          backgroundColor: '#F9F6FF',
          color: '#5E4B8B',
          border: '1px solid #E2D8FF',
          fontFamily: 'Poppins, sans-serif',
          '&:focus': {
            borderColor: '#9A7BFF',
          },
          '&::placeholder': {
            color: '#9A7BFF',
          },
        },
      },
    },
    NavLink: {
      defaultProps: {
        bg: '#F9F6FF',
      },
      styles: {
        root: {
          backgroundColor: '#F9F6FF',
          fontWeight: 500,
          '&:hover': {
            backgroundColor: '#F0EBFF',
          },
          '&[dataActive]': {
            backgroundColor: '#E2D8FF !important',
          },
        },
      },
    },
    Calendar: {
      styles: {
        day: {
          backgroundColor: '#F9F6FF',
          color: '#5E4B8B',
          fontFamily: 'Poppins, sans-serif',
          '&:hover': {
            backgroundColor: '#F0EBFF',
          },
          '&[dataSelected]': {
            backgroundColor: '#9A7BFF',
            color: '#F9F6FF',
            '&:hover': {
              backgroundColor: '#7D5EFF',
            },
          },
          '&[dataWeekend]': {
            color: '#9A7BFF',
          },
          '&[dataOutside]': {
            color: '#C5B3FF',
          },
        },
        monthCell: {
          backgroundColor: '#F9F6FF',
          fontFamily: 'Poppins, sans-serif',
          '&:hover': {
            backgroundColor: '#F0EBFF',
          },
        },
        yearCell: {
          backgroundColor: '#F9F6FF',
          fontFamily: 'Poppins, sans-serif',
          '&:hover': {
            backgroundColor: '#F0EBFF',
          },
        },
        monthPickerControl: {
          '&:hover': {
            backgroundColor: '#F0EBFF',
          },
        },
        yearPickerControl: {
          '&:hover': {
            backgroundColor: '#F0EBFF',
          },
        },
        calendarHeaderControl: {
          color: '#5E4B8B',
          '&:hover': {
            backgroundColor: '#F0EBFF',
          },
        },
        calendarHeaderLevel: {
          color: '#5E4B8B',
          '&:hover': {
            backgroundColor: '#F0EBFF',
          },
        },
      },
    },
  },
});

function App() {
  return (
    <MantineProvider theme={theme} colorScheme="light">
      <Notifications />
      <Router>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </Router>
    </MantineProvider>
  );
}

export default App;
