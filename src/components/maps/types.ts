import { StyleProp, ViewStyle } from 'react-native';

export interface MapCoordinate {
  latitude: number;
  longitude: number;
}

export interface MapRegion extends MapCoordinate {
  latitudeDelta: number;
  longitudeDelta: number;
}

export interface MapMarkerItem {
  id: string;
  coordinate: MapCoordinate;
  title?: string;
  description?: string;
  pinColor?: string;
}

export interface VoyaroMapViewProps {
  initialRegion?: MapRegion;
  region?: MapRegion;
  markers?: MapMarkerItem[];
  selectedMarkerId?: string;
  style?: StyleProp<ViewStyle>;
  onRegionChangeComplete?: (region: MapRegion) => void;
  onMarkerPress?: (marker: MapMarkerItem) => void;
  showsUserLocation?: boolean;
  showsCompass?: boolean;
  showsScale?: boolean;
  testID?: string;
}
