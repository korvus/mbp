import React, {useContext} from 'react';
import { PinContext, Text } from '../store';


const Warningcontent = () => {
    const {setDm} = useContext(PinContext);
    return (
        <div className="innerModal">
            <div title="Echap" onClick={() => setDm(false)} className="close"></div>
            <Text tid="noBakery" />
        </div>
    );
}

export default Warningcontent;