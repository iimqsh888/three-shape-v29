// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;
/// @dev Strict UTF-8, 1..16 Unicode code points; no ASCII controls or all-ASCII-space title.
library NineFruitsTitle {
    function valid(string memory title) internal pure returns(bool){
        bytes memory b=bytes(title);if(b.length==0||b.length>64)return false;uint256 i;uint256 count;bool visible;
        while(i<b.length){uint8 c=uint8(b[i]);uint256 size;
            if(c<0x80){if(c<0x20||c==0x7f)return false;if(c!=0x20)visible=true;size=1;}
            else if(c>=0xc2&&c<=0xdf){size=2;visible=true;}
            else if(c>=0xe0&&c<=0xef){size=3;visible=true;}
            else if(c>=0xf0&&c<=0xf4){size=4;visible=true;}
            else return false;
            if(i+size>b.length)return false;
            for(uint256 j=1;j<size;++j){uint8 d=uint8(b[i+j]);if(d<0x80||d>0xbf)return false;}
            if(size==3){uint8 d=uint8(b[i+1]);if((c==0xe0&&d<0xa0)||(c==0xed&&d>0x9f))return false;}
            if(size==4){uint8 d=uint8(b[i+1]);if((c==0xf0&&d<0x90)||(c==0xf4&&d>0x8f))return false;}
            i+=size;if(++count>16)return false;
        }return visible;
    }
}
